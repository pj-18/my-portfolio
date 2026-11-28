/**
 * Gathers the shows you've booked (kept in the UP_NEXT_SHOWS repository variable), looks their films
 * up on Letterboxd, and saves both in src/data/up-next.json.
 *
 *   npm run up-next
 *
 * Each film is fetched from Letterboxd once, then cached. It never fails a build: if the variable
 * isn't set (a local run) the last saved shows are kept, and a film it can't find just shows without
 * a poster (or with the `poster` you set yourself).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { filmSlug, type UpNextData } from '../src/lib/up-next.ts';
import { lookUp, parseShows, sortShows, todayUtc, VARIABLE } from './up-next-shared.ts';

const OUT = new URL('../src/data/up-next.json', import.meta.url);
const RETRY_MISSES_AFTER = 24 * 3_600_000;
const today = todayUtc();

const log = (message: string) => console.log(`[up-next] ${message}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function load(): Promise<UpNextData> {
  try {
    const data = JSON.parse(await readFile(OUT, 'utf8')) as Partial<UpNextData>;
    return { fetchedAt: data.fetchedAt ?? null, shows: data.shows ?? [], films: data.films ?? {}, misses: data.misses ?? {} };
  } catch {
    return { fetchedAt: null, shows: [], films: {}, misses: {} };
  }
}

/**
 * Shows booked with the "Add a show" workflow arrive in the UP_NEXT_SHOWS variable (the deploy passes
 * it in). Without it (a local run) the last saved shows are kept, minus the ones that are over.
 */
function syncShows(data: UpNextData) {
  const text = process.env[VARIABLE];
  try {
    if (text === undefined) throw new Error(`${VARIABLE} isn't set`);
    data.shows = sortShows(parseShows(text).filter((show) => show.date >= today));
    log(`${data.shows.length} ${data.shows.length === 1 ? 'show' : 'shows'} booked`);
  } catch (error) {
    data.shows = data.shows.filter((show) => show.date >= today);
    log(`couldn't read the booked shows (${(error as Error).message}); keeping the last ${data.shows.length} saved`);
  }
}

async function main() {
  const data = await load();
  const before = JSON.stringify({ ...data, fetchedAt: null });
  syncShows(data);

  const slugs = [...new Set(data.shows.map(filmSlug).filter((slug): slug is string => !!slug))];
  const now = Date.now();
  const todo = slugs.filter(
    (slug) =>
      // not looked up yet, or cached before running times were saved
      (!data.films[slug] || !('runtime' in data.films[slug])) &&
      !(data.misses[slug] && now - Date.parse(data.misses[slug]) < RETRY_MISSES_AFTER),
  );

  if (!todo.length && slugs.length) log(`${slugs.length} booked ${slugs.length === 1 ? 'film' : 'films'}, all cached`);
  let found = 0;
  for (const [i, slug] of todo.entries()) {
    if (i) await wait(1500); // be gentle: one page at a time
    try {
      const film = await lookUp(slug);
      if (film) {
        data.films[slug] = film;
        delete data.misses[slug];
        found++;
        log(
          `${slug} → ${film.title}${film.year ? ` (${film.year})` : ''}, ${film.runtime ? `${film.runtime} mins` : 'no running time'}${film.poster ? '' : ', no poster'}`,
        );
      } else {
        data.misses[slug] = new Date().toISOString();
        log(`no Letterboxd page at /film/${slug}/: give the film's Letterboxd link instead of its title`);
      }
    } catch (error) {
      log(`couldn't reach Letterboxd for ${slug} (${(error as Error).message}); it'll be tried again next build`);
    }
  }
  if (todo.length) log(`found ${found} of ${todo.length} new ${todo.length === 1 ? 'film' : 'films'}`);

  if (JSON.stringify({ ...data, fetchedAt: null }) === before) return;
  data.fetchedAt = new Date().toISOString();
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  log(`skipped (${(error as Error).message})`);
}
