/**
 * Pulls your most-played artists and songs from Last.fm into src/data/music.json, then
 * finds cover art, 30-second previews and Apple Music links for the songs (iTunes Search
 * API) and photos for the artists (Deezer). Neither of those two needs a key.
 *
 *   npm run music                            # username from src/site.config.ts
 *   LASTFM_USER=someone npm run music        # or override it
 *   node scripts/sync-music.ts --if-missing  # only fetch when there is no data yet
 *   npm run music:sample                     # rebuild the made-up preview data
 *
 * Last.fm needs an API key in LASTFM_API_KEY: put it in .env locally (see .env.example)
 * and in a repository secret for GitHub Actions. Like the Letterboxd sync, this never
 * fails a build. If Last.fm can't be reached the last good copy stays, and songs and
 * artists that were already looked up are never looked up again.
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { site } from '../src/site.config.ts';
import type { Music, MusicArtist, MusicPeriod, MusicTrack, PeriodKey, RecentTrack } from '../src/lib/music-types.ts';

try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // no .env file: the key can still come from the environment
}

const OUT = new URL('../src/data/music.json', import.meta.url);
const SAMPLE_OUT = new URL('../src/data/music.sample.json', import.meta.url);
const args = process.argv.slice(2);
const ifMissing = args.includes('--if-missing');
const sampleMode = args.includes('--sample');
const user = (process.env.LASTFM_USER || site.music.lastfm || '').trim();
const apiKey = (process.env.LASTFM_API_KEY || '').trim();
const storefront = (site.music.storefront || 'us').trim().toLowerCase();
const UA = 'Mozilla/5.0 (compatible; portfolio-build/1.0)';
const PERIODS: PeriodKey[] = ['1month', '12month', 'overall'];
/** A few spares, so hiding something in site.config.ts still leaves ten. */
const LIMIT = 15;
/** Apple allows roughly 20 searches a minute. */
const APPLE_GAP = 3200;

const log = (message: string) => console.log(`[music] ${message}`);
const warn = (message: string) => console.warn(`[music] ${message}`);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/* ---------- files ---------- */

async function exists(url: URL) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function readMusic(url: URL): Promise<Music | null> {
  try {
    return JSON.parse(await readFile(url, 'utf8')) as Music;
  } catch {
    return null;
  }
}

async function save(url: URL, music: Music) {
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, JSON.stringify(music, null, 2) + '\n', 'utf8');
}

async function getJson(url: URL | string, timeout = 20_000) {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  const body: any = await response.json().catch(() => null);
  return { status: response.status, body };
}

/* ---------- matching names across services ---------- */

/** Drop the bits that differ between services: "(From “RRR”)", " - Remastered", "feat. …". */
const strip = (text: string) =>
  text
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s+[-–—]\s+.*$/, ' ')
    .replace(/\s(?:feat\.?|ft\.?|featuring)\s.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Comparable form: no accents or marks, lower case, letters and digits only (any script). */
const norm = (text: string) =>
  strip(text)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const lower = (text: string) => text.trim().toLowerCase();

const splitArtists = (artist: string) =>
  artist
    .split(/\s*(?:,|&|\+|;|\/|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\band\b|\bx\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

const STOP = new Set(['the', 'and', 'with', 'feat', 'from', 'band', 'music', 'orchestra']);
const tokens = (text: string) => new Set(norm(text).split(' ').filter((t) => t.length > 3 && !STOP.has(t)));

function sameArtist(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const theirs = tokens(b);
  return [...tokens(a)].some((t) => theirs.has(t));
}

function sameTitle(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `));
}

const VARIANT = /\b(remix|live|karaoke|instrumental|cover|sped up|slowed|reverb|lo-?fi|8d|acoustic|unplugged|reprise)\b/i;

/* ---------- Last.fm ---------- */

type LfImage = { '#text': string; size: string };
/** Last.fm hands out this grey star when it has no picture. */
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
const lfImage = (images?: LfImage[]) => {
  const url = images?.find((image) => image.size === 'extralarge')?.['#text'] || images?.at(-1)?.['#text'] || '';
  return url && !url.includes(PLACEHOLDER) ? url : null;
};
const plays = (value: unknown) => Number(value) || 0;
const asList = <T>(value: T | T[] | undefined): T[] => (Array.isArray(value) ? value : value ? [value] : []);

/** https://www.last.fm/music/Artist/_/Song → the same page in your library, with your own play count. */
const library = (url: string) =>
  url.replace('https://www.last.fm/music/', `https://www.last.fm/user/${encodeURIComponent(user)}/library/music/`);

async function lastfm(method: string, params: Record<string, string> = {}) {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.search = new URLSearchParams({ method, user, api_key: apiKey, format: 'json', ...params }).toString();
  // Never print `url`: it carries the API key.
  const { status, body } = await getJson(url);
  if (!body || body.error) throw new Error(body?.message ? `${body.message} (error ${body.error})` : `HTTP ${status}`);
  return body;
}

/**
 * Apple Music credits a collab as one artist ("A & B"). For the artist chart each person gets their own
 * entry, so this splits on "&", commas, "feat." and a spaced "x". Names in site.config.ts → music.keepTogether
 * ("Simon & Garfunkel") stay whole. Songs keep their full credit.
 */
const keepTogether = new Set(site.music.keepTogether.map((name) => lower(name)));
const COLLAB = /\s*(?:,|&|\+|;|\/\/|\bfeat\.?\s|\bft\.?\s|\bfeaturing\b|\svs\.?\s|\sx\s)\s*/i;
const people = (credit: string) =>
  keepTogether.has(lower(credit)) ? [credit] : credit.split(COLLAB).map((part) => part.trim()).filter(Boolean);

const artistPage = (name: string) =>
  `https://www.last.fm/user/${encodeURIComponent(user)}/library/music/${encodeURIComponent(name).replace(/%20/g, '+')}`;

async function charts(period: PeriodKey): Promise<MusicPeriod> {
  // Ask for more artists than we keep: splitting collabs reshuffles the ranking.
  const [top, songs] = await Promise.all([
    lastfm('user.gettopartists', { period, limit: '60' }),
    lastfm('user.gettoptracks', { period, limit: String(LIMIT) }),
  ]);
  const byName = new Map<string, MusicArtist>();
  for (const credit of asList<any>(top.topartists?.artist)) {
    const names = people(credit.name);
    for (const name of names) {
      const existing = byName.get(norm(name));
      if (existing) existing.plays += plays(credit.playcount);
      else
        byName.set(norm(name), {
          name,
          plays: plays(credit.playcount),
          url: names.length === 1 ? library(credit.url) : artistPage(name),
          photo: null,
        });
    }
  }
  const artists = [...byName.values()].sort((a, b) => b.plays - a.plays).slice(0, LIMIT);
  const tracks = asList<any>(songs.toptracks?.track).map(
    (track): MusicTrack => ({
      name: track.name,
      artist: track.artist?.name ?? '',
      plays: plays(track.playcount),
      url: library(track.url),
      art: lfImage(track.image),
      preview: null,
      apple: null,
    }),
  );
  return { key: period, artists, tracks };
}

async function lastPlayed(): Promise<RecentTrack | null> {
  let body;
  try {
    body = await lastfm('user.getrecenttracks', { limit: '1' });
  } catch (error) {
    warn(`skipping "last played" (${reason(error)})`);
    return null;
  }
  const track = asList<any>(body.recenttracks?.track)[0];
  if (!track) return null;
  const nowPlaying = track['@attr']?.nowplaying === 'true';
  const uts = Number(track.date?.uts);
  return {
    name: track.name,
    artist: track.artist?.['#text'] ?? track.artist?.name ?? '',
    plays: 0,
    url: library(track.url),
    art: lfImage(track.image),
    preview: null,
    apple: null,
    at: nowPlaying || !uts ? new Date().toISOString() : new Date(uts * 1000).toISOString(),
    nowPlaying,
  };
}

async function about() {
  const { user: info = {} } = await lastfm('user.getinfo');
  const since = Number(info.registered?.unixtime ?? info.registered?.['#text']);
  return {
    profile: (info.url as string) || `https://www.last.fm/user/${encodeURIComponent(user)}`,
    scrobbles: plays(info.playcount) || null,
    artistCount: plays(info.artist_count) || null,
    since: since ? new Date(since * 1000).toISOString() : null,
  };
}

/* ---------- Apple (iTunes Search API): cover art, previews, links ---------- */

type AppleSong = {
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
};

let lastApple = 0;
let appleBlocked = false;

async function appleSearch(term: string): Promise<AppleSong[]> {
  const wait = lastApple + APPLE_GAP - Date.now();
  if (wait > 0) await sleep(wait);
  lastApple = Date.now();
  const url = new URL('https://itunes.apple.com/search');
  url.search = new URLSearchParams({ term, country: storefront, media: 'music', entity: 'song', limit: '10' }).toString();
  const { status, body } = await getJson(url, 15_000);
  if (status === 403 || status === 429) {
    appleBlocked = true;
    throw new Error(`Apple's search is rate limiting (HTTP ${status}); the rest wait for the next sync`);
  }
  if (!body) throw new Error(`HTTP ${status}`);
  return (body.results ?? []) as AppleSong[];
}

/** The search result that is really this song: same title, same artist, not a remix unless asked for. */
function bestMatch(song: MusicTrack, results: AppleSong[]) {
  const lead = splitArtists(song.artist)[0] ?? song.artist;
  const wantsVariant = VARIANT.test(song.name);
  let best: AppleSong | null = null;
  let bestScore = -Infinity;
  for (const [i, result] of results.entries()) {
    if (!sameTitle(song.name, result.trackName) || !sameArtist(song.artist, result.artistName)) continue;
    const score =
      // Scrobbles from Apple Music carry Apple's exact title, so an exact match is the very same release.
      (lower(song.name) === lower(result.trackName) ? 2 : 0) +
      (norm(song.name) === norm(result.trackName) ? 2 : 0) +
      (sameArtist(lead, result.artistName) ? 1 : 0) +
      // the artist exactly, rather than a duet or a cover credited to someone else as well
      (norm(song.artist) === norm(result.artistName) ? 1 : 0) -
      (!wantsVariant && VARIANT.test(result.trackName) ? 3 : 0) -
      i * 0.01;
    if (score > bestScore) {
      best = result;
      bestScore = score;
    }
  }
  return best;
}

const cleanAppleUrl = (url?: string) => {
  if (!url) return null;
  const link = new URL(url);
  link.searchParams.delete('uo');
  return link.toString();
};

async function lookUpSong(song: MusicTrack) {
  const title = strip(song.name) || song.name;
  const lead = splitArtists(song.artist)[0] ?? song.artist;
  let match = bestMatch(song, await appleSearch(`${lead} ${title}`));
  if (!match && title.length > 2) match = bestMatch(song, await appleSearch(title));
  if (match) {
    song.art = match.artworkUrl100 ?? song.art;
    song.preview = match.previewUrl ?? null;
    song.apple = cleanAppleUrl(match.trackViewUrl);
  } else if (!song.art && apiKey && !sampleMode) {
    // Not on Apple Music in this storefront: Last.fm may still know the album cover.
    const info = await lastfm('track.getinfo', { artist: song.artist, track: song.name }).catch(() => null);
    song.art = lfImage(info?.track?.album?.image);
  }
  song.looked = true;
}

/* ---------- Deezer: artist photos ---------- */

async function lookUpArtist(artist: MusicArtist) {
  const names = [...new Set([artist.name, ...splitArtists(artist.name)])].slice(0, 2);
  artist.photo = null;
  for (const query of names) {
    await sleep(150);
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`;
    const { status, body } = await getJson(url, 15_000);
    if (!body || body.error) throw new Error(body?.error?.message ?? `HTTP ${status}`);
    const want = norm(query);
    type DeezerArtist = { name: string; nb_fan?: number; picture_xl?: string };
    const hit = ((body.data ?? []) as DeezerArtist[])
      .filter((candidate) => norm(candidate.name) === want)
      .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
    if (!hit) continue;
    const photo = hit.picture_xl;
    // Deezer's "no picture" URL has an empty hash: /images/artist//1000x1000-…
    if (photo && !photo.includes('/artist//')) artist.photo = photo;
    break;
  }
  artist.looked = true;
}

/* ---------- enrichment, reusing earlier lookups ---------- */

const songKey = (song: { artist: string; name: string }) => `${norm(song.artist)}|${norm(song.name)}`;

function copySong(from: MusicTrack, to: MusicTrack) {
  to.art = from.art ?? to.art;
  to.preview = from.preview;
  to.apple = from.apple;
  to.looked = from.looked;
}

async function enrich(music: Music, previous: Music | null) {
  const knownSongs = new Map<string, MusicTrack>();
  const knownArtists = new Map<string, MusicArtist>();
  for (const period of previous?.periods ?? []) {
    for (const song of period.tracks) if (song.looked) knownSongs.set(songKey(song), song);
    for (const artist of period.artists) if (artist.looked) knownArtists.set(norm(artist.name), artist);
  }
  if (previous?.recent?.looked) knownSongs.set(songKey(previous.recent), previous.recent);

  // Songs: one Apple search per distinct song, copied to every chart it appears in.
  const songs = new Map<string, MusicTrack[]>();
  for (const song of [...music.periods.flatMap((p) => p.tracks), ...(music.recent ? [music.recent] : [])]) {
    const known = knownSongs.get(songKey(song));
    if (known) copySong(known, song);
    else songs.set(songKey(song), [...(songs.get(songKey(song)) ?? []), song]);
  }
  if (songs.size) {
    const seconds = Math.ceil((songs.size * APPLE_GAP) / 1000);
    log(`looking up ${songs.size} new song${songs.size === 1 ? '' : 's'} on Apple Music (up to ~${seconds}s: Apple allows ~20 searches a minute)`);
  }
  for (const [first, ...rest] of songs.values()) {
    if (appleBlocked) break;
    try {
      await lookUpSong(first);
      rest.forEach((song) => copySong(first, song));
    } catch (error) {
      warn(`no Apple lookup for "${first.name}" (${reason(error)})`);
    }
  }

  // Artists: one Deezer search per distinct artist.
  const artists = new Map<string, MusicArtist[]>();
  for (const artist of music.periods.flatMap((p) => p.artists)) {
    const known = knownArtists.get(norm(artist.name));
    if (known) {
      artist.photo = known.photo;
      artist.looked = true;
    } else artists.set(norm(artist.name), [...(artists.get(norm(artist.name)) ?? []), artist]);
  }
  for (const [first, ...rest] of artists.values()) {
    try {
      await lookUpArtist(first);
      rest.forEach((artist) => Object.assign(artist, { photo: first.photo, looked: true }));
    } catch (error) {
      warn(`no photo lookup for ${first.name} (${reason(error)})`);
    }
  }
}

function report(music: Music, label: string) {
  const songs = [...new Map(music.periods.flatMap((p) => p.tracks).map((s) => [songKey(s), s])).values()];
  const artists = [...new Map(music.periods.flatMap((p) => p.artists).map((a) => [norm(a.name), a])).values()];
  const count = <T>(list: T[], test: (item: T) => unknown) => list.filter(test).length;
  log(
    `${label}: ${music.periods.map((p) => `${p.key} ${p.artists.length}/${p.tracks.length}`).join(', ')} (artists/songs); ` +
      `art for ${count(songs, (s) => s.art)}/${songs.length} songs, previews for ${count(songs, (s) => s.preview)}, ` +
      `photos for ${count(artists, (a) => a.photo)}/${artists.length} artists`,
  );
}

/* ---------- sample data for `npm run dev` ---------- */

const SAMPLE_ARTISTS = [
  'A.R. Rahman',
  'Anirudh Ravichander',
  'Hans Zimmer',
  'Ilaiyaraaja',
  'Ludwig Göransson',
  'Thaman S',
  'Sid Sriram',
  'Daft Punk',
  'Ennio Morricone',
  'Justin Hurwitz',
  'Santhosh Narayanan',
  'Devi Sri Prasad',
  'Hildur Guðnadóttir',
  'M.M. Keeravaani',
];

const SAMPLE_SONGS: [name: string, artist: string][] = [
  ['Time', 'Hans Zimmer'],
  ['Hukum - Thalaivar Alappara', 'Anirudh Ravichander'],
  ['Jai Ho', 'A.R. Rahman'],
  ['Can You Hear The Music', 'Ludwig Göransson'],
  ['Samajavaragamana', 'Sid Sriram'],
  ['Derezzed', 'Daft Punk'],
  ["Mia & Sebastian's Theme", 'Justin Hurwitz'],
  ['The Ecstasy of Gold', 'Ennio Morricone'],
  ['Cornfield Chase', 'Hans Zimmer'],
  ['Naatu Naatu', 'Rahul Sipligunj & Kaala Bhairava'],
  ['Arabic Kuthu', 'Anirudh Ravichander'],
  ['Srivalli', 'Sid Sriram'],
  ['Bathroom Dance', 'Hildur Guðnadóttir'],
  ['Kaathalae Kaathalae', 'Govind Vasantha'],
];

const lastfmPath = (text: string) => encodeURIComponent(text).replace(/%20/g, '+');

async function writeSample() {
  const rotate = <T>(list: T[], by: number) => [...list.slice(by), ...list.slice(0, by)];
  const curve = (top: number, rank: number) => Math.max(1, Math.round(top * 0.84 ** rank));
  const shape: { key: PeriodKey; top: number; shift: number }[] = [
    { key: '1month', top: 64, shift: 4 },
    { key: '12month', top: 412, shift: 0 },
    { key: 'overall', top: 1630, shift: 2 },
  ];
  const periods = shape.map(({ key, top, shift }): MusicPeriod => ({
    key,
    artists: rotate(SAMPLE_ARTISTS, shift).map((name, rank) => ({
      name,
      plays: curve(top, rank),
      url: `https://www.last.fm/music/${lastfmPath(name)}`,
      photo: null,
    })),
    tracks: rotate(SAMPLE_SONGS, shift).map(([name, artist], rank) => ({
      name,
      artist,
      plays: curve(Math.round(top / 4), rank),
      url: `https://www.last.fm/music/${lastfmPath(artist)}/_/${lastfmPath(name)}`,
      art: null,
      preview: null,
      apple: null,
    })),
  }));
  const [song, artist] = SAMPLE_SONGS[5];
  const music: Music = {
    username: 'sample',
    profile: 'https://www.last.fm/',
    fetchedAt: new Date().toISOString(),
    sample: true,
    scrobbles: 18240,
    artistCount: 1137,
    since: '2016-03-12T00:00:00.000Z',
    recent: {
      name: song,
      artist,
      plays: 0,
      url: `https://www.last.fm/music/${lastfmPath(artist)}/_/${lastfmPath(song)}`,
      art: null,
      preview: null,
      apple: null,
      at: new Date(Date.now() - 2 * 3600_000).toISOString(),
      nowPlaying: false,
    },
    periods,
  };
  await enrich(music, await readMusic(SAMPLE_OUT));
  await save(SAMPLE_OUT, music);
  report(music, 'sample');
}

/* ---------- main ---------- */

async function skip(why: string) {
  warn(why);
  warn(
    (await exists(OUT))
      ? 'keeping the last good copy of src/data/music.json'
      : 'no data yet: the soundtrack section stays out of production builds (dev shows sample data)',
  );
}

async function main() {
  if (sampleMode) return writeSample();
  if (ifMissing && (await exists(OUT))) return;
  if (!user) return skip('no Last.fm username yet: set music.lastfm in src/site.config.ts');
  if (!apiKey) return skip('no LASTFM_API_KEY: add it to .env (see .env.example) or to the CI secrets');

  let music: Music;
  try {
    const [profile, periods, recent] = await Promise.all([about(), Promise.all(PERIODS.map(charts)), lastPlayed()]);
    music = { username: user, fetchedAt: new Date().toISOString(), ...profile, recent, periods };
  } catch (error) {
    return skip(`couldn't read Last.fm for ${user} (${reason(error)})`);
  }
  if (!music.periods.some((p) => p.artists.length || p.tracks.length)) {
    return skip(`Last.fm has no scrobbles for ${user} yet`);
  }
  await enrich(music, await readMusic(OUT));
  await save(OUT, music);
  report(music, user);
}

try {
  await main();
} catch (error) {
  // A sync problem should never stop the site from building.
  warn(`sync failed (${reason(error)}); carrying on`);
}
