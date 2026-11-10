import type { ImageMetadata } from 'astro';

export interface FilmEntry {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  /** Half-star steps from 0.5 to 5, or null when the entry was not rated. */
  rating: number | null;
  liked: boolean;
  rewatch: boolean;
  /** YYYY-MM-DD */
  watchedDate: string;
  url: string;
  review: string | null;
  spoilers: boolean;
  poster: string | null;
  posterColor: string | null;
}

export interface Film extends FilmEntry {
  image: ImageMetadata | null;
}

interface FilmData {
  fetchedAt: string;
  profile: string;
  entries: FilmEntry[];
}

// Both files are optional, so they are globbed rather than imported directly.
// The cache is what `npm run fetch` just wrote; the fallback is the committed snapshot.
const files = import.meta.glob<FilmData>('../data/{cache,fallback}/films.json', { eager: true, import: 'default' });
const posters = import.meta.glob<ImageMetadata>('../data/cache/posters/*.jpg', { eager: true, import: 'default' });

const data = files['../data/cache/films.json'] ?? files['../data/fallback/films.json'] ?? null;

export const films: Film[] = (data?.entries ?? []).map((entry) => ({
  ...entry,
  image: (entry.poster && posters[`../data/cache/posters/${entry.poster}`]) || null,
}));

export const filmsFetchedAt = data?.fetchedAt ?? null;
