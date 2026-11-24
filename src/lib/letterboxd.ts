/**
 * Parses a Letterboxd RSS feed (https://letterboxd.com/<username>/rss/) into plain diary entries.
 * Pure and offline: the network lives in scripts/sync.ts. The feed is treated as untrusted input,
 * so everything is reduced to plain text and links are checked before they are kept.
 */
import { XMLParser } from 'fast-xml-parser';
import { parse as parseHtml } from 'node-html-parser';

export interface DiaryEntry {
  /** The feed's guid, e.g. "letterboxd-review-123456789". */
  id: string;
  title: string;
  year: number | null;
  /** 0.5 to 5 in half steps, or null when the film was logged without a rating. */
  rating: number | null;
  liked: boolean;
  rewatch: boolean;
  /** Calendar day, YYYY-MM-DD. */
  watchedDate: string | null;
  /** Link to the review or diary entry on Letterboxd. */
  url: string;
  /** The review as plain text; empty when the film was only logged, or the review has spoilers. */
  review: string;
  spoilers: boolean;
  /** Remote poster image, when Letterboxd supplies one. */
  posterUrl: string | null;
}

/** What scripts/sync.ts writes to src/generated/films.json. */
export interface FilmsData {
  source: 'letterboxd';
  username: string;
  fetchedAt: string;
  entries: (DiaryEntry & { /** File name inside src/generated/posters, or null. */ poster: string | null })[];
}

/** Reviews can run to thousands of words; nothing on the site needs more than this. */
const MAX_REVIEW_CHARS = 1500;

const LETTERBOXD_HOST = /(^|\.)letterboxd\.com$/;
const POSTER_HOST = /(^|\.)ltrbxd\.com$/;
const SPOILER_NOTICE = /^this review may contain spoilers\.?$/i;
const WATCHED_ONLY = /^watched on \w+,? \w+ \d{1,2},? \d{4}\.?$/i;

const xml = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  htmlEntities: true,
  isArray: (name) => name === 'item',
});

export function parseDiaryFeed(feed: string, limit: number): DiaryEntry[] {
  let channel: unknown;
  try {
    channel = xml.parse(feed)?.rss?.channel;
  } catch {
    channel = undefined;
  }
  if (!channel || typeof channel !== 'object') {
    throw new Error('the response is not an RSS feed');
  }

  const items: unknown = (channel as { item?: unknown }).item ?? [];
  if (!Array.isArray(items)) return [];

  const entries: DiaryEntry[] = [];
  for (const item of items) {
    const entry = toEntry(item);
    if (entry) entries.push(entry);
    if (entries.length >= limit) break;
  }
  return entries;
}

function toEntry(item: unknown): DiaryEntry | null {
  if (!item || typeof item !== 'object') return null;
  const field = (name: string) => text((item as Record<string, unknown>)[name]);

  // Lists and other activity share the feed but carry no film title.
  const title = field('letterboxd:filmTitle');
  const url = httpsUrl(field('link'), LETTERBOXD_HOST);
  if (!title || !url) return null;

  const id = field('guid') || url;
  const year = Number.parseInt(field('letterboxd:filmYear'), 10);
  const rating = Number.parseFloat(field('letterboxd:memberRating'));
  const watchedDate = field('letterboxd:watchedDate');
  const { review, spoilers, posterUrl } = readDescription(field('description'), id);

  return {
    id,
    title,
    year: year >= 1870 && year <= 2200 ? year : null,
    rating: rating >= 0.5 && rating <= 5 && Number.isInteger(rating * 2) ? rating : null,
    liked: field('letterboxd:memberLike').toLowerCase() === 'yes',
    rewatch: field('letterboxd:rewatch').toLowerCase() === 'yes',
    watchedDate: /^\d{4}-\d{2}-\d{2}$/.test(watchedDate) ? watchedDate : null,
    url,
    review,
    spoilers,
    posterUrl,
  };
}

/** The description is an HTML fragment: a poster in the first paragraph, then the review. */
function readDescription(html: string, id: string): Pick<DiaryEntry, 'review' | 'spoilers' | 'posterUrl'> {
  if (!html) return { review: '', spoilers: false, posterUrl: null };

  // Keep block boundaries as line breaks so words on either side never run together.
  const root = parseHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|blockquote|div|h[1-6])>/gi, '$&\n'));

  const image = root.querySelector('img');
  const src = image?.getAttribute('src') ?? '';
  const posterUrl = /empty-poster/i.test(src) ? null : httpsUrl(src, POSTER_HOST);
  image?.remove();

  const paragraphs = root.text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let spoilers = false;
  if (paragraphs[0] && SPOILER_NOTICE.test(paragraphs[0])) {
    spoilers = true;
    paragraphs.shift();
  }

  const body = paragraphs.join(' ');
  const loggedOnly = id.startsWith('letterboxd-watch-') || WATCHED_ONLY.test(body);

  return {
    // A spoiler review stays behind its link, as it does on Letterboxd.
    review: loggedOnly || spoilers ? '' : capLength(body, MAX_REVIEW_CHARS),
    spoilers,
    posterUrl,
  };
}

function capLength(value: string, max: number): string {
  if (value.length <= max) return value;
  const head = value.slice(0, max);
  const lastSpace = head.lastIndexOf(' ');
  return `${head.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function httpsUrl(value: string, host: RegExp): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && host.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
