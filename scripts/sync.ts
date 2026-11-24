/**
 * Fetches everything the site needs from the outside world, once, before a build:
 *
 *   - the latest Letterboxd diary entries (RSS) and their posters
 *   - chess ratings from Lichess or Chess.com
 *
 * Results are written to src/generated/ (git-ignored). Nothing here fails the build: when a
 * source cannot be reached, the files from the last good run are left in place and the site
 * carries on with those.
 *
 *   node scripts/sync.ts              always refetch (used by `npm run build`)
 *   node scripts/sync.ts --if-stale   skip sources fetched in the last few hours (used by `npm run dev`)
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parseChessCom, parseLichess, type ChessData } from '../src/lib/chess-ratings.ts';
import { parseDiaryFeed, type FilmsData } from '../src/lib/letterboxd.ts';
import { site } from '../src/lib/site.ts';
import { findPlaceholders } from './placeholders.ts';

const OUT = path.resolve(import.meta.dirname, '../src/generated');
const POSTERS = path.join(OUT, 'posters');
const FILMS_FILE = path.join(OUT, 'films.json');
const CHESS_FILE = path.join(OUT, 'chess.json');

// A generic client name: no personal details are sent with these requests.
const USER_AGENT = 'static-site-build/1.0 (scheduled build; RSS and public API reader)';
const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;
const FRESH_FOR_MS = 6 * 60 * 60 * 1000;
const MAX_POSTER_BYTES = 10 * 1024 * 1024;

const onlyIfStale = process.argv.includes('--if-stale');

const log = (message: string) => console.log(`[sync] ${message}`);
const warn = (message: string) => console.warn(`[sync] warning: ${message}`);

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

/** GET with a timeout. Network errors, 429 and 5xx are retried; other statuses are final. */
async function get(url: string, accept: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return response;
      lastError = new HttpError(response.status);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw lastError;
}

function describe(error: unknown): string {
  if (error instanceof HttpError) return error.status === 404 ? 'HTTP 404, is the username right?' : error.message;
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') return 'timed out';
    const code = (error.cause as { code?: string } | undefined)?.code;
    if (code && /CERT|UNABLE_TO_VERIFY|SELF_SIGNED/.test(code)) {
      // Typical of an office firewall or proxy that intercepts HTTPS. The check is not bypassed.
      return `the site's TLS certificate could not be verified (${code}); a firewall or proxy on this network may be intercepting the connection`;
    }
    return code ? `${error.message} (${code})` : error.message;
  }
  return String(error);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Write to a temporary file first so a crash never leaves half a file behind. */
async function writeJson(file: string, data: unknown): Promise<void> {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await rename(temporary, file);
}

const isFresh = (fetchedAt: string) => Date.now() - new Date(fetchedAt).getTime() < FRESH_FOR_MS;

// ── Films ────────────────────────────────────────────────────────────────────────────────

/** Downloads a poster once and stores it as a 2:3 JPEG. Returns the file name, or null. */
async function savePoster(url: string | null): Promise<string | null> {
  if (!url) return null;
  const name = `${createHash('sha1').update(url.split('?')[0]!).digest('hex').slice(0, 16)}.jpg`;
  const file = path.join(POSTERS, name);
  if (existsSync(file)) return name;

  try {
    const response = await get(url, 'image/avif,image/webp,image/jpeg,image/*;q=0.8');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_POSTER_BYTES) throw new Error('unexpected file size');
    // Re-encoding proves the bytes really are an image and normalises format and shape.
    const jpeg = await sharp(bytes).rotate().resize(600, 900, { fit: 'cover' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    await writeFile(file, jpeg);
    return name;
  } catch (error) {
    warn(`films: poster skipped (${describe(error)}): ${url}`);
    return null;
  }
}

async function removeUnusedPosters(keep: Set<string>): Promise<void> {
  for (const name of await readdir(POSTERS)) {
    if (!keep.has(name)) await rm(path.join(POSTERS, name), { force: true });
  }
}

async function syncFilms(): Promise<void> {
  const { username, entries: limit } = site.letterboxd;
  if (!username) {
    // Nothing fetched earlier should outlive the username it was fetched for.
    await rm(FILMS_FILE, { force: true });
    await removeUnusedPosters(new Set());
    log('films: no Letterboxd username in content/site.json, so the site shows the sample entries');
    return;
  }

  const cached = await readJson<FilmsData>(FILMS_FILE);
  const previous = cached?.username === username ? cached : null;
  if (onlyIfStale && previous && isFresh(previous.fetchedAt)) {
    log(`films: ${previous.entries.length} entries already fetched recently`);
    return;
  }

  try {
    const response = await get(
      `https://letterboxd.com/${encodeURIComponent(username)}/rss/`,
      'application/rss+xml, application/xml;q=0.9, */*;q=0.5',
    );
    const diary = parseDiaryFeed(await response.text(), limit);

    const entries: FilmsData['entries'] = [];
    for (const entry of diary) {
      entries.push({ ...entry, poster: await savePoster(entry.posterUrl) });
    }

    const data: FilmsData = { source: 'letterboxd', username, fetchedAt: new Date().toISOString(), entries };
    await writeJson(FILMS_FILE, data);
    await removeUnusedPosters(new Set(entries.flatMap((entry) => (entry.poster ? [entry.poster] : []))));
    log(`films: ${entries.length} diary entries from letterboxd.com/${username}`);
  } catch (error) {
    warn(
      `films: could not refresh the Letterboxd diary (${describe(error)}). ` +
        (previous
          ? `Keeping the ${previous.entries.length} entries fetched on ${previous.fetchedAt.slice(0, 10)}.`
          : 'There is no earlier copy, so the Films section will show a short fallback message.'),
    );
  }
}

// ── Chess ────────────────────────────────────────────────────────────────────────────────

async function syncChess(): Promise<void> {
  const { platform, username } = site.chess;
  if (!username) {
    await rm(CHESS_FILE, { force: true });
    log('chess: no username in content/site.json, so the site shows the ratings from content/chess.md');
    return;
  }

  const cached = await readJson<ChessData>(CHESS_FILE);
  const previous = cached?.username === username && cached.platform === platform ? cached : null;
  if (onlyIfStale && previous && isFresh(previous.fetchedAt)) {
    log('chess: ratings already fetched recently');
    return;
  }

  try {
    const url =
      platform === 'lichess'
        ? `https://lichess.org/api/user/${encodeURIComponent(username)}`
        : `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`;
    const json: unknown = await (await get(url, 'application/json')).json();
    const ratings = platform === 'lichess' ? parseLichess(json) : parseChessCom(json);
    if (ratings.length === 0) throw new Error('the profile has no rated games');

    const data: ChessData = { platform, username, fetchedAt: new Date().toISOString(), ratings };
    await writeJson(CHESS_FILE, data);
    log(`chess: ${ratings.map((r) => `${r.label} ${r.rating}`).join(', ')}`);
  } catch (error) {
    warn(
      `chess: could not refresh ratings (${describe(error)}). ` +
        (previous ? 'Keeping the last fetched ratings.' : 'Using the ratings written in content/chess.md.'),
    );
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────────────────

await mkdir(POSTERS, { recursive: true });

for (const [name, task] of [['films', syncFilms], ['chess', syncChess]] as const) {
  try {
    await task();
  } catch (error) {
    // A bug here should be loud, but it should not stop the site from building.
    warn(`${name}: unexpected error, skipped. ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  }
}

const placeholders = await findPlaceholders();
if (placeholders.length > 0) {
  log(`${placeholders.length} placeholders still to replace. Run "npm run placeholders" for the list.`);
}
