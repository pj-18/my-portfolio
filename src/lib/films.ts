/**
 * The Films section's data. In order of preference:
 *   1. live      the diary fetched by scripts/sync.ts (or the copy from its last good run)
 *   2. unavailable   a username is set but there is nothing to show; the section links to the profile
 *   3. sample    no username yet; shows content/films-sample.json
 */
import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import sampleJson from '../../content/films-sample.json';
import type { FilmsData } from './letterboxd.ts';
import { letterboxdUrl, site } from './site.ts';

export interface Film {
  id: string;
  title: string;
  year: number | null;
  rating: number | null;
  liked: boolean;
  rewatch: boolean;
  watchedDate: string | null;
  url: string;
  review: string;
  spoilers: boolean;
  poster: ImageMetadata | null;
}

export type Films =
  | { mode: 'live'; entries: Film[]; fetchedAt: string; profileUrl: string }
  | { mode: 'unavailable'; profileUrl: string }
  | { mode: 'sample'; entries: Film[] };

// Globs rather than imports: these files do not exist until `npm run sync` has run.
const generated = import.meta.glob<FilmsData>('/src/generated/films.json', { eager: true, import: 'default' });
const posters = import.meta.glob<ImageMetadata>('/src/generated/posters/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const sampleSchema = z.array(
  z.object({
    title: z.string().min(1),
    year: z.number().int().nullable().default(null),
    rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().default(null),
    liked: z.boolean().default(false),
    rewatch: z.boolean().default(false),
    watchedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    url: z.url({ protocol: /^https$/ }),
    review: z.string().default(''),
  }),
);

function sampleFilms(): Film[] {
  const parsed = sampleSchema.safeParse(sampleJson);
  if (!parsed.success) {
    throw new Error(`content/films-sample.json is not valid:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data.map((film, i) => ({ ...film, id: `sample-${i}`, spoilers: false, poster: null }));
}

export function getFilms(): Films {
  const { username, entries: limit } = site.letterboxd;
  if (!username || !letterboxdUrl) {
    return { mode: 'sample', entries: sampleFilms().slice(0, limit) };
  }

  const data = Object.values(generated)[0];
  if (!data || data.username !== username || data.entries.length === 0) {
    return { mode: 'unavailable', profileUrl: letterboxdUrl };
  }

  return {
    mode: 'live',
    fetchedAt: data.fetchedAt,
    profileUrl: letterboxdUrl,
    entries: data.entries.slice(0, limit).map(({ poster, posterUrl: _remote, ...film }) => ({
      ...film,
      poster: (poster && posters[`/src/generated/posters/${poster}`]) || null,
    })),
  };
}
