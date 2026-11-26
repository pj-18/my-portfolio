/**
 * Looks up the films you've booked (upNext in src/site.config.ts) on Letterboxd and
 * caches their poster, title and page link in src/data/up-next.json.
 *
 *   npm run up-next
 *
 * Only films that aren't cached yet are fetched, one page at a time, so a build
 * normally makes no requests at all. It never fails a build: anything it can't
 * find just shows without a poster (or with the `poster` you set yourself).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { site } from '../src/site.config.ts';
import { filmSlug, type LetterboxdFilm, type UpNextData } from '../src/lib/up-next.ts';

const OUT = new URL('../src/data/up-next.json', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; portfolio-build/1.0)';
const RETRY_MISSES_AFTER = 24 * 3_600_000;
const today = new Date().toISOString().slice(0, 10);

const log = (message: string) => console.log(`[up-next] ${message}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function load(): Promise<UpNextData> {
  try {
    const data = JSON.parse(await readFile(OUT, 'utf8')) as UpNextData;
    return { fetchedAt: data.fetchedAt ?? null, films: data.films ?? {}, misses: data.misses ?? {} };
  } catch {
    return { fetchedAt: null, films: {}, misses: {} };
  }
}

/** The film page's JSON-LD block carries the title, release date and poster. */
async function lookUp(slug: string): Promise<LetterboxdFilm | null> {
  const url = `https://letterboxd.com/film/${encodeURIComponent(slug)}/`;
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const block = html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)?.[1] ?? '';
  const json = block.slice(block.indexOf('{'), block.lastIndexOf('}') + 1);
  const info = JSON.parse(json) as {
    name?: string;
    image?: string;
    url?: string;
    releasedEvent?: { startDate?: string }[];
  };
  const year = Number(
    info.releasedEvent?.[0]?.startDate?.slice(0, 4) || html.match(/\/films\/year\/(\d{4})\//)?.[1],
  );
  return {
    slug,
    title: info.name ?? slug,
    year: Number.isFinite(year) && year > 0 ? year : null,
    // Letterboxd serves a few fixed sizes; 230×345 is plenty for the ticket (and sharp at 2x).
    poster: info.image ? info.image.replace(/-0-\d+-0-\d+-crop/, '-0-230-0-345-crop') : null,
    url: info.url ?? url,
  };
}

async function main() {
  const data = await load();
  const upcoming = site.upNext.filter((show) => !show.placeholder && show.date >= today);
  const slugs = [...new Set(upcoming.map(filmSlug).filter((slug): slug is string => !!slug))];
  const now = Date.now();
  const todo = slugs.filter(
    (slug) => !data.films[slug] && !(data.misses[slug] && now - Date.parse(data.misses[slug]) < RETRY_MISSES_AFTER),
  );

  if (!todo.length) {
    if (slugs.length) log(`${slugs.length} booked ${slugs.length === 1 ? 'film' : 'films'}, all cached`);
    return;
  }

  let found = 0;
  for (const [i, slug] of todo.entries()) {
    if (i) await wait(1500); // be gentle: one page at a time
    try {
      const film = await lookUp(slug);
      if (film) {
        data.films[slug] = film;
        delete data.misses[slug];
        found++;
        log(`${slug} → ${film.title}${film.year ? ` (${film.year})` : ''}${film.poster ? '' : ', no poster'}`);
      } else {
        data.misses[slug] = new Date().toISOString();
        log(
          `no Letterboxd page at /film/${slug}/: set \`film\` to the film's Letterboxd URL in upNext (src/site.config.ts)`,
        );
      }
    } catch (error) {
      log(`couldn't reach Letterboxd for ${slug} (${(error as Error).message}); it'll be tried again next build`);
    }
  }

  data.fetchedAt = new Date().toISOString();
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
  log(`found ${found} of ${todo.length} new ${todo.length === 1 ? 'film' : 'films'}`);
}

try {
  await main();
} catch (error) {
  log(`skipped (${(error as Error).message})`);
}
