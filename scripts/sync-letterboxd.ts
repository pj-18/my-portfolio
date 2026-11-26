/**
 * Pulls a public Letterboxd RSS feed into src/data/letterboxd.json.
 *
 *   npm run films                         # username from src/site.config.ts
 *   LETTERBOXD_USER=someone npm run films  # or override it
 *   node scripts/sync-letterboxd.ts --if-missing   # only fetch when there is no data yet
 *
 * It never fails a build. If the feed can't be fetched or parsed, the last good
 * copy stays in place, and an empty diary is written if there is no copy at all.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { site } from '../src/site.config.ts';
import type { Diary, DiaryEntry, FilmList } from '../src/lib/letterboxd-types.ts';

const OUT = new URL('../src/data/letterboxd.json', import.meta.url);
const username = (process.env.LETTERBOXD_USER || site.letterboxd || '').trim();
const ifMissing = process.argv.includes('--if-missing');

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#')) {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED[code.toLowerCase()] ?? match;
  });
}

function unwrapCdata(text: string): string {
  return text.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
}

/** Inner text of the first <name>…</name> element (CDATA unwrapped, not entity-decoded). */
function tag(xml: string, name: string): string | undefined {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^]*?)</${name}>`));
  return match ? unwrapCdata(match[1]).trim() : undefined;
}

/** <p> blocks → plain-text paragraphs. Images are dropped, <br> becomes \n. */
function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p(?:\s[^>]*)?>([^]*?)<\/p>/g)]
    .map(([, inner]) => inner)
    .filter((inner) => !/^\s*<img\b/i.test(inner))
    .map((inner) =>
      decode(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .trim(),
    )
    .filter(Boolean);
}

const toNumber = (value?: string) => (value && Number.isFinite(Number(value)) ? Number(value) : null);
const toIso = (value?: string) => {
  const date = value ? new Date(value) : new Date(NaN);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};
const SPOILER = /^this review may contain spoilers\.?$/i;

function parseEntry(item: string, guid: string): DiaryEntry | null {
  const title = tag(item, 'letterboxd:filmTitle');
  if (!title) return null;
  const html = tag(item, 'description') ?? '';
  const published = toIso(tag(item, 'pubDate'));
  const kind = guid.startsWith('letterboxd-review-') ? 'review' : 'watch';
  // Diary logs without a review only carry a "Watched on …" line, which we don't need.
  const text = kind === 'review' ? paragraphs(html) : [];
  const poster = html.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
  return {
    id: guid,
    kind,
    title: decode(title),
    year: toNumber(tag(item, 'letterboxd:filmYear')),
    rating: toNumber(tag(item, 'letterboxd:memberRating')),
    liked: tag(item, 'letterboxd:memberLike') === 'Yes',
    rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
    watched: tag(item, 'letterboxd:watchedDate') ?? published.slice(0, 10),
    published,
    url: decode(tag(item, 'link') ?? ''),
    poster: poster ? decode(poster) : null,
    review: text.filter((p) => !SPOILER.test(p)),
    spoilers: text.some((p) => SPOILER.test(p)),
    tmdb: toNumber(tag(item, 'tmdb:movieId')),
  };
}

function parseList(item: string, guid: string): FilmList {
  const html = tag(item, 'description') ?? '';
  const films = [...html.matchAll(/<li>\s*<a href="([^"]+)">([^]*?)<\/a>\s*<\/li>/g)].map(([, url, title]) => ({
    title: decode(title.trim()),
    url: decode(url),
  }));
  const more = Number(html.match(/\.\.\.plus (\d+) more/i)?.[1] ?? 0);
  const intro = html.split(/<[ou]l\b/)[0];
  return {
    id: guid,
    title: decode(tag(item, 'title') ?? 'Untitled list'),
    url: decode(tag(item, 'link') ?? ''),
    description: paragraphs(intro)[0] ?? null,
    ranked: /<ol\b/.test(html),
    films,
    total: films.length + more,
    published: toIso(tag(item, 'pubDate')),
  };
}

function parseFeed(xml: string): Diary {
  const channel = xml.split('<item>')[0];
  const name = decode(tag(channel, 'title') ?? '').replace(/^Letterboxd\s*-\s*/, '') || username;
  const entries: DiaryEntry[] = [];
  const lists: FilmList[] = [];

  for (const [, item] of xml.matchAll(/<item>([^]*?)<\/item>/g)) {
    const guid = tag(item, 'guid') ?? '';
    if (guid.startsWith('letterboxd-list-')) {
      lists.push(parseList(item, guid));
      continue;
    }
    const entry = parseEntry(item, guid);
    if (entry) entries.push(entry);
  }

  entries.sort((a, b) => b.watched.localeCompare(a.watched) || b.published.localeCompare(a.published));
  return {
    username,
    name,
    profile: `https://letterboxd.com/${username}/`,
    fetchedAt: new Date().toISOString(),
    entries,
    lists,
  };
}

async function exists(url: URL) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function save(diary: Diary) {
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(diary, null, 2) + '\n', 'utf8');
}

async function keepLastGoodCopy(reason: string) {
  console.warn(`[films] ${reason}`);
  if (await exists(OUT)) {
    console.warn('[films] keeping the last good copy of src/data/letterboxd.json');
    return;
  }
  console.warn('[films] no copy yet, writing an empty diary so the build can carry on');
  await save({
    username,
    name: username,
    profile: username ? `https://letterboxd.com/${username}/` : 'https://letterboxd.com/',
    fetchedAt: null,
    entries: [],
    lists: [],
  });
}

async function main() {
  if (ifMissing && (await exists(OUT))) return;
  if (!username) return keepLastGoodCopy('no Letterboxd username in src/site.config.ts');

  const feed = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  let xml: string;
  try {
    const response = await fetch(feed, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; portfolio-build/1.0)',
        accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.1',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } catch (error) {
    return keepLastGoodCopy(`couldn't fetch ${feed} (${(error as Error).message})`);
  }

  const diary = parseFeed(xml);
  if (!diary.entries.length && !diary.lists.length) {
    return keepLastGoodCopy(`the feed for @${username} had no diary entries or lists`);
  }
  await save(diary);
  const reviews = diary.entries.filter((e) => e.kind === 'review').length;
  console.log(
    `[films] @${username}: ${diary.entries.length} diary entries (${reviews} reviews), ${diary.lists.length} lists`,
  );
}

await main();
