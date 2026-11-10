#!/usr/bin/env node
/**
 * Fetches everything the site needs from the outside world, at build time:
 *
 *   - the Letterboxd diary (public RSS feed) and its posters
 *   - chess ratings from the Chess.com and Lichess public APIs
 *
 * Results land in src/data/cache (gitignored). Nothing here can fail the build:
 * if a source is down, the last cached copy is kept, and if there is no cache
 * the site falls back to the committed snapshot in src/data/fallback.
 *
 * Flags:
 *   --if-missing   skip the network when a cache already exists (used by `npm run dev`)
 *   --snapshot     after fetching, copy the cache into src/data/fallback (commit that)
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'src/data/cache');
const fallbackDir = path.join(root, 'src/data/fallback');
const posterDir = path.join(cacheDir, 'posters');
const filmsFile = path.join(cacheDir, 'films.json');
const chessFile = path.join(cacheDir, 'chess.json');

const args = new Set(process.argv.slice(2));
const site = JSON.parse(await readFile(path.join(root, 'src/content/site.json'), 'utf8'));
const { letterboxd, chesscom, lichess } = site.handles;

/** How many diary entries to keep: one featured review plus the list. */
const FILM_COUNT = 13;
/** A generic client name. Some hosts reject requests with no User-Agent at all. */
const USER_AGENT = 'Mozilla/5.0 (compatible; static-site-build/1.0)';

const log = (msg) => console.log(`[data] ${msg}`);
const warn = (msg) => console.warn(`[data] WARNING: ${msg}`);

async function get(url, as = 'text', tries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (as === 'json') return await res.json();
      if (as === 'buffer') return Buffer.from(await res.arrayBuffer());
      return await res.text();
    } catch (error) {
      lastError = error;
      if (attempt < tries) await new Promise((r) => setTimeout(r, 750 * attempt));
    }
  }
  throw new Error(`${url} (${lastError?.message ?? 'unknown error'})`);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Letterboxd                                                          */
/* ------------------------------------------------------------------ */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

/** Letterboxd puts the poster and the review in one HTML blob. Split them apart. */
function parseDescription(html = '') {
  const poster = html.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
  const spoilers = /may contain spoilers/i.test(html);

  const text = decodeEntities(
    html
      .replace(/<p>\s*<img[^>]*>\s*<\/p>/gi, '')
      .replace(/<p>\s*<em>\s*This review may contain spoilers\.?\s*<\/em>\s*<\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // An entry with no review gets an automatic "Watched on <date>." description.
  const review = text && !/^Watched on \w+day\b/i.test(text) ? text : null;
  return { poster, review, spoilers: Boolean(review) && spoilers };
}

function parseFeed(xml) {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => name === 'item',
  });
  const items = parser.parse(xml)?.rss?.channel?.item ?? [];

  return items
    .filter((item) => item['letterboxd:filmTitle'] && item['letterboxd:watchedDate'])
    .map((item) => {
      const { poster, review, spoilers } = parseDescription(String(item.description ?? ''));
      const link = String(item.link);
      const slug = link.match(/\/film\/([^/]+)\//)?.[1] ?? String(item.guid).replace(/\W+/g, '-');
      const rating = Number.parseFloat(item['letterboxd:memberRating']);
      return {
        id: String(item.guid),
        slug,
        title: decodeEntities(String(item['letterboxd:filmTitle'])),
        year: item['letterboxd:filmYear'] ? Number(item['letterboxd:filmYear']) : null,
        rating: Number.isFinite(rating) ? rating : null,
        liked: item['letterboxd:memberLike'] === 'Yes',
        rewatch: item['letterboxd:rewatch'] === 'Yes',
        watchedDate: String(item['letterboxd:watchedDate']),
        url: link,
        review,
        spoilers,
        posterUrl: poster,
        poster: null,
        posterColor: null,
      };
    });
}

/** Download posters we do not have yet, and drop the ones no entry uses any more. */
async function syncPosters(entries) {
  await mkdir(posterDir, { recursive: true });
  const wanted = new Set();

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.posterUrl) return;
      const file = `${entry.slug}.jpg`;
      const target = path.join(posterDir, file);
      try {
        if (!existsSync(target)) {
          const buffer = await get(entry.posterUrl, 'buffer', 2);
          // Re-encode: proves the download is a real image and normalises the format.
          await sharp(buffer).jpeg({ quality: 90 }).toFile(target);
        }
        const { dominant } = await sharp(target).stats();
        entry.poster = file;
        entry.posterColor = `rgb(${dominant.r} ${dominant.g} ${dominant.b})`;
        wanted.add(file);
      } catch (error) {
        warn(`poster for "${entry.title}" skipped: ${error.message}`);
      }
    }),
  );

  for (const file of await readdir(posterDir)) {
    if (!wanted.has(file)) await rm(path.join(posterDir, file), { force: true });
  }
}

async function fetchFilms() {
  let data;
  try {
    const xml = await get(`https://letterboxd.com/${letterboxd}/rss/`);
    const entries = parseFeed(xml).slice(0, FILM_COUNT);
    if (entries.length === 0) throw new Error('the feed contained no diary entries');
    data = { fetchedAt: new Date().toISOString(), profile: `https://letterboxd.com/${letterboxd}/`, entries };
    log(`Letterboxd: ${entries.length} diary entries`);
  } catch (error) {
    warn(`Letterboxd feed unavailable: ${error.message}`);
    data = (await readJson(filmsFile)) ?? (await readJson(path.join(fallbackDir, 'films.json')));
    if (!data) {
      warn('no cached or fallback diary. The Films section will show a link to Letterboxd instead.');
      return;
    }
    log(`Letterboxd: using the copy from ${data.fetchedAt}`);
  }

  await syncPosters(data.entries);
  await writeFile(filmsFile, JSON.stringify(data, null, 2) + '\n');
}

/* ------------------------------------------------------------------ */
/* Chess                                                               */
/* ------------------------------------------------------------------ */

async function fetchChessCom() {
  const stats = await get(`https://api.chess.com/pub/player/${chesscom.toLowerCase()}/stats`, 'json');
  const formats = {};
  for (const [key, name] of [['chess_rapid', 'rapid'], ['chess_blitz', 'blitz'], ['chess_bullet', 'bullet'], ['chess_daily', 'daily']]) {
    const entry = stats[key];
    if (!entry?.last?.rating) continue;
    formats[name] = {
      rating: entry.last.rating,
      best: entry.best?.rating ?? null,
      games: (entry.record?.win ?? 0) + (entry.record?.loss ?? 0) + (entry.record?.draw ?? 0),
    };
  }
  if (Object.keys(formats).length === 0) throw new Error('no rated games found');
  return { fetchedAt: new Date().toISOString(), formats };
}

async function fetchLichess() {
  const user = await get(`https://lichess.org/api/user/${lichess}`, 'json');
  const formats = {};
  for (const name of ['rapid', 'blitz', 'bullet', 'classical']) {
    const perf = user.perfs?.[name];
    if (!perf?.games) continue;
    formats[name] = { rating: perf.rating, games: perf.games, provisional: Boolean(perf.prov) };
  }
  return { fetchedAt: new Date().toISOString(), formats };
}

async function fetchChess() {
  const previous = (await readJson(chessFile)) ?? (await readJson(path.join(fallbackDir, 'chess.json'))) ?? {};
  const data = { chesscom: previous.chesscom ?? null, lichess: previous.lichess ?? null };

  for (const [key, label, fetcher] of [['chesscom', 'Chess.com', fetchChessCom], ['lichess', 'Lichess', fetchLichess]]) {
    try {
      data[key] = await fetcher();
      log(`${label}: ratings updated`);
    } catch (error) {
      warn(`${label} unavailable: ${error.message}${data[key] ? ` (keeping the copy from ${data[key].fetchedAt})` : ''}`);
    }
  }

  if (data.chesscom || data.lichess) await writeFile(chessFile, JSON.stringify(data, null, 2) + '\n');
}

/* ------------------------------------------------------------------ */

await mkdir(cacheDir, { recursive: true });

if (args.has('--if-missing') && existsSync(filmsFile) && existsSync(chessFile)) {
  log('cache found, skipping the network (run `npm run fetch` to refresh)');
} else {
  // Each source is independent; a failure in one never blocks the other.
  await Promise.all([
    fetchFilms().catch((error) => warn(`films step failed: ${error.message}`)),
    fetchChess().catch((error) => warn(`chess step failed: ${error.message}`)),
  ]);
}

if (args.has('--snapshot')) {
  await mkdir(fallbackDir, { recursive: true });
  for (const file of ['films.json', 'chess.json']) {
    if (existsSync(path.join(cacheDir, file))) {
      await copyFile(path.join(cacheDir, file), path.join(fallbackDir, file));
      log(`snapshot: src/data/fallback/${file}`);
    }
  }
}
