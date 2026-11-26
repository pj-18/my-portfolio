/**
 * Shared by the build script (scripts/sync-up-next.ts) and the page, so both
 * agree on which Letterboxd page a booking points at.
 */

/** What the build learns about a film from its Letterboxd page. */
export interface LetterboxdFilm {
  slug: string;
  title: string;
  year: number | null;
  poster: string | null;
  url: string;
}

export interface UpNextData {
  fetchedAt: string | null;
  films: Record<string, LetterboxdFilm>;
  /** Slugs that had no Letterboxd page when last tried (ISO time), so they aren't retried on every build. */
  misses: Record<string, string>;
}

/** 'Spider-Man: Across the Spider-Verse' → 'spider-man-across-the-spider-verse', the way Letterboxd names its pages. */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The Letterboxd slug for a booking: from `film` (a film page URL or a bare slug)
 * when given, otherwise guessed from the title.
 */
export function filmSlug(booking: { film?: string; title?: string }): string | null {
  const film = booking.film?.trim();
  if (film) {
    const fromUrl = film.match(/letterboxd\.com\/film\/([^/?#]+)/i);
    return (fromUrl ? fromUrl[1] : film.replace(/^\/?(film\/)?|\/$/g, '')).toLowerCase() || null;
  }
  return booking.title ? slugify(booking.title) || null : null;
}
