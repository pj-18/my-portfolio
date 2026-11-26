import raw from '../data/letterboxd.json';
import { site } from '../site.config';
import type { Diary, DiaryEntry } from './letterboxd-types';

export type { DiaryEntry, FilmList } from './letterboxd-types';

export const diary = raw as Diary;
export const entries: DiaryEntry[] = diary.entries;
export const latest = entries[0] ?? null;

const rated = entries.filter((e) => e.rating != null);

export const stats = {
  logged: entries.length,
  reviews: entries.filter((e) => e.kind === 'review').length,
  liked: entries.filter((e) => e.liked).length,
  rewatches: entries.filter((e) => e.rewatch).length,
  average: rated.length ? rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length : null,
  since: entries.at(-1)?.watched ?? null,
};

/** Ten buckets, ½★ … ★★★★★, like the histogram on a Letterboxd profile. */
export const histogram = Array.from({ length: 10 }, (_, i) => {
  const rating = (i + 1) / 2;
  return { rating, count: rated.filter((e) => e.rating === rating).length };
});
export const histogramPeak = Math.max(1, ...histogram.map((h) => h.count));

export function verdict(average: number | null): string {
  if (average == null) return '';
  if (average < 2.5) return 'a brutal critic';
  if (average < 3.2) return 'a tough crowd';
  if (average < 3.8) return 'a fair judge';
  return 'easy to please';
}

const words = (e: DiaryEntry) => e.review.join(' ').length;

/** The review that gets the full poster treatment: highest rated of the longer ones. */
export const pick: DiaryEntry | null = (() => {
  const reviews = entries.filter((e) => e.kind === 'review' && e.review.length && e.rating != null);
  const long = reviews.filter((e) => words(e) >= 120);
  const pool = long.length ? long : reviews;
  return (
    [...pool].sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) || Number(b.liked) - Number(a.liked) || b.watched.localeCompare(a.watched),
    )[0] ?? null
  );
})();

const hidden = new Set(site.hideFromQuotes.map((t) => t.toLowerCase()));

/** Short single-paragraph reviews: the ticker of one-liners. */
export const oneLiners = entries
  .filter(
    (e) =>
      e.kind === 'review' &&
      e.review.length === 1 &&
      e.review[0].length <= 110 &&
      e.id !== pick?.id &&
      !e.spoilers &&
      !hidden.has(e.title.toLowerCase()),
  )
  .map((e) => ({ quote: e.review[0].replace(/\s*\n\s*/g, ' '), entry: e }));

export const lists = diary.lists.slice(0, 6);

/** Letterboxd serves every poster at a few standard sizes; build a srcset from the feed's URL. */
export function poster(url: string | null) {
  if (!url) return null;
  const size = /-0-\d+-0-\d+-crop/;
  if (!size.test(url)) return { src: url, srcset: undefined };
  const at = (w: number) => url.replace(size, `-0-${w}-0-${Math.round(w * 1.5)}-crop`);
  return { src: at(300), srcset: `${at(150)} 150w, ${at(300)} 300w, ${at(460)} 460w, ${at(600)} 600w` };
}

/** From your diary entry to the film's own Letterboxd page. */
export const filmUrl = (e: DiaryEntry) => e.url.replace(/letterboxd\.com\/[^/]+\/film\//, 'letterboxd.com/film/');

/** Films worth recommending for the post-credits "spin the reel". */
export const recommendations = (() => {
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (!e.poster || !(e.liked || (e.rating ?? 0) >= 3.5) || seen.has(e.title)) return false;
    seen.add(e.title);
    return true;
  });
})();
