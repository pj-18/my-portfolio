import type { Music, MusicArtist, MusicTrack, PeriodKey, RecentTrack } from './music-types';
import { site } from '../site.config';

/* Both files are optional: a fresh clone has neither until `npm run music` (or `music:sample`) runs. */
const files = import.meta.glob<Music>('../data/music*.json', { eager: true, import: 'default' });
const real = files['../data/music.json'];
const sample = files['../data/music.sample.json'];
const filled = (data?: Music): data is Music =>
  !!data?.periods?.some((period) => period.artists.length > 0 || period.tracks.length > 0);

/**
 * Your Last.fm charts. In `npm run dev` the sample data stands in until there are some;
 * a production build without data gets null, and the soundtrack section stays out.
 */
export const music: Music | null = filled(real) ? real : import.meta.env.DEV && filled(sample) ? sample : null;
export const isSample = !!music?.sample;

/* ---------- site.config.ts → hide ---------- */

const hidden = new Set(site.music.hide.map((name) => name.trim().toLowerCase()).filter(Boolean));
const people = (artist: string) => [artist, ...artist.split(/\s*(?:,|&)\s*/)];
const isHidden = (...names: string[]) => names.some((name) => hidden.has(name.trim().toLowerCase()));

/* ---------- artwork ---------- */

/** Apple (mzstatic) and Deezer image URLs carry their size in the path, so ask for exactly what's needed. */
export function sized(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  if (url.includes('mzstatic.com')) return url.replace(/\/\d+x\d+[a-z]*\.(?:jpe?g|png|webp)$/i, `/${size}x${size}bb.jpg`);
  if (url.includes('dzcdn.net')) return url.replace(/\/\d+x\d+-/, `/${size}x${size}-`);
  return url;
}

export function sizes(url: string | null | undefined, widths: number[]): string | undefined {
  if (!url || !/mzstatic\.com|dzcdn\.net/.test(url)) return undefined;
  return widths.map((width) => `${sized(url, width)} ${width}w`).join(', ');
}

/* ---------- charts, ready for the page ---------- */

export const PERIODS: Record<PeriodKey, { label: string; long: string }> = {
  '7day': { label: '7 days', long: 'the last 7 days' },
  '1month': { label: '30 days', long: 'the last 30 days' },
  '3month': { label: '3 months', long: 'the last 3 months' },
  '6month': { label: '6 months', long: 'the last 6 months' },
  '12month': { label: '12 months', long: 'the last 12 months' },
  overall: { label: 'All time', long: 'all time' },
};

export interface Act extends MusicArtist {
  rank: number;
  /** 1 = headliner, then 2–3, 4–6 and 7–10: the poster's type sizes. */
  tier: 1 | 2 | 3 | 4;
  /** Their photo, or the cover of one of their songs when there is no photo. */
  picture: string | null;
  /** Their most-played song in the same chart, when it made the top ten. */
  favourite: MusicTrack | null;
}

export interface Cut extends MusicTrack {
  rank: number;
  /** "A1" … "B5": the record's running order. */
  code: string;
  side: 'A' | 'B';
}

export interface Chart {
  key: PeriodKey;
  label: string;
  long: string;
  acts: Act[];
  cuts: Cut[];
}

const lower = (text: string) => text.toLowerCase();
const byArtist = (song: MusicTrack, artist: string) => lower(song.artist).includes(lower(artist));

// Any song cover we know of, per artist, for artists without a photo.
const allSongs = [...(music?.periods.flatMap((period) => period.tracks) ?? []), ...(music?.recent ? [music.recent] : [])];
const coverFor = (artist: string) => allSongs.find((song) => song.art && byArtist(song, artist))?.art ?? null;

const tier = (rank: number): Act['tier'] => (rank === 1 ? 1 : rank <= 3 ? 2 : rank <= 6 ? 3 : 4);

export const charts: Chart[] = (music?.periods ?? [])
  .map((period) => {
    const songs = period.tracks.filter((song) => !isHidden(song.name, ...people(song.artist))).slice(0, 10);
    const artists = period.artists.filter((artist) => !isHidden(...people(artist.name))).slice(0, 10);
    const half = Math.ceil(songs.length / 2);
    return {
      key: period.key,
      ...PERIODS[period.key],
      acts: artists.map((artist, i) => ({
        ...artist,
        rank: i + 1,
        tier: tier(i + 1),
        picture: artist.photo ?? coverFor(artist.name),
        favourite: songs.find((song) => byArtist(song, artist.name)) ?? null,
      })),
      cuts: songs.map((song, i) => {
        const side = i < half ? 'A' : 'B';
        return { ...song, rank: i + 1, side, code: `${side}${i < half ? i + 1 : i - half + 1}` } as Cut;
      }),
    };
  })
  .filter((chart) => chart.acts.length > 0 || chart.cuts.length > 0);

/** The chart the page opens on: site.config.ts → music.period, else the 12-month one. */
export const firstChart: Chart | undefined =
  charts.find((chart) => chart.key === site.music.period) ?? charts.find((chart) => chart.key === '12month') ?? charts[0];

export const lastPlayed: RecentTrack | null =
  music?.recent && !isHidden(music.recent.name, ...people(music.recent.artist)) ? music.recent : null;

/** "Hans Zimmer, A.R. Rahman and Ilaiyaraaja": the top of the bill, for the end credits. */
export const headliners = (count = 3) => {
  const names = (firstChart?.acts ?? []).slice(0, count).map((act) => act.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');
};
