/**
 * Shared by the build scripts, the page and its browser script, so all of them agree on
 * which Letterboxd page a booking points at, and on where a show is in its evening.
 */
import type { Booking } from '../site.config.ts';

/** What the build learns about a film from its Letterboxd page. */
export interface LetterboxdFilm {
  slug: string;
  title: string;
  year: number | null;
  /** Running time in minutes (missing on films cached before it was saved: they're looked up again). */
  runtime?: number | null;
  poster: string | null;
  url: string;
}

/* ---------- a show's evening ----------
   Countdown → "Rolling" from the start until the runtime plus a 15-minute interval is up →
   "Wrapped" until an hour after the runtime is up → off the page.
   e.g. 21:00, 120 mins: rolling 21:00–23:15, wrapped 23:15–00:00, gone at 00:00. */

const MINUTE = 60_000;
const DAY = 1_440 * MINUTE;
export const INTERVAL_MINUTES = 15;
export const LINGER_MINUTES = 60;
/** When Letterboxd doesn't know a film's length yet. */
export const GUESS_RUNTIME = 150;

/** '+05:30' → 330. */
export const offsetMinutes = (offset: string) => {
  const m = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0;
};

export interface ShowTimes {
  /** Midnight starting the show's day, in the cinema's time zone. */
  day: number;
  /** When it starts, wraps and leaves the page (ms since 1970). No start or wrap without a time. */
  start: number | null;
  wraps: number | null;
  gone: number;
}

/** `offset` is the cinema's UTC offset, '+05:30' for India: show times are local to the cinema. */
export function showTimes(date: string, time: string | undefined, runtime: number | null | undefined, offset: string): ShowTimes {
  const day = Date.parse(`${date}T00:00:00${offset}`);
  if (!time) return { day, start: null, wraps: null, gone: day + DAY };
  const start = Date.parse(`${date}T${time}:00${offset}`);
  const over = start + (runtime || GUESS_RUNTIME) * MINUTE;
  return { day, start, wraps: over + INTERVAL_MINUTES * MINUTE, gone: over + LINGER_MINUTES * MINUTE };
}

export type ShowState = 'booked' | 'rolling' | 'wrapped' | 'gone';

/** What the ticket's stub says at `now`. */
export function showStatus(times: ShowTimes, now: number, offset: number): { state: ShowState; num: string; unit: string } {
  if (now >= times.gone) return { state: 'gone', num: '', unit: '' };
  if (times.wraps !== null && now >= times.wraps) return { state: 'wrapped', num: 'Wrapped', unit: 'credits rolled' };
  if (times.start !== null && times.wraps !== null && now >= times.start) {
    const till = new Date(times.wraps + offset * MINUTE).toISOString().slice(11, 16);
    return { state: 'rolling', num: 'Rolling', unit: `till ${till}` };
  }
  const today = Math.floor((now + offset * MINUTE) / DAY) * DAY - offset * MINUTE;
  const days = Math.round((times.day - today) / DAY);
  return days <= 0
    ? { state: 'booked', num: 'Today', unit: '' }
    : { state: 'booked', num: String(days), unit: days === 1 ? 'day to go' : 'days to go' };
}

export interface UpNextData {
  fetchedAt: string | null;
  /** Shows booked as GitHub issues, as of the last sync. */
  shows: Booking[];
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
