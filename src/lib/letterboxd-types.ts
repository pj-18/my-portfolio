/** Shape of src/data/letterboxd.json, written by scripts/sync-letterboxd.ts. */

export interface DiaryEntry {
  /** Letterboxd guid, e.g. "letterboxd-review-1519858895". */
  id: string;
  /** A "review" has text; a "watch" is a diary log with (maybe) a rating. */
  kind: 'review' | 'watch';
  title: string;
  year: number | null;
  /** 0.5 – 5 in half steps, or null when unrated. */
  rating: number | null;
  liked: boolean;
  rewatch: boolean;
  /** YYYY-MM-DD */
  watched: string;
  /** ISO timestamp of the log. */
  published: string;
  /** Your diary entry on Letterboxd. */
  url: string;
  poster: string | null;
  /** Review paragraphs as plain text (line breaks kept as \n). */
  review: string[];
  spoilers: boolean;
  tmdb: number | null;
}

export interface FilmList {
  id: string;
  title: string;
  url: string;
  description: string | null;
  ranked: boolean;
  /** The first (up to) ten films the feed includes. */
  films: { title: string; url: string }[];
  /** Total films in the list, including the ones the feed leaves out. */
  total: number;
  published: string;
}

export interface Diary {
  username: string;
  name: string;
  profile: string;
  fetchedAt: string | null;
  entries: DiaryEntry[];
  lists: FilmList[];
}
