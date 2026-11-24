/**
 * Turns the public profile responses from Lichess and Chess.com into one small shape.
 * Pure and offline: the network lives in scripts/sync.ts.
 */

export interface Rating {
  label: string;
  rating: number;
  /** Rated games played in this time control, when known. */
  games?: number;
  /** Lichess marks a rating provisional until enough games are played. */
  provisional?: boolean;
}

/** What scripts/sync.ts writes to src/generated/chess.json. */
export interface ChessData {
  platform: 'lichess' | 'chesscom';
  username: string;
  fetchedAt: string;
  ratings: Rating[];
}

/** Time controls in the order they are shown. */
const LICHESS = [
  ['rapid', 'Rapid'],
  ['blitz', 'Blitz'],
  ['bullet', 'Bullet'],
  ['classical', 'Classical'],
  ['correspondence', 'Correspondence'],
] as const;

const CHESS_COM = [
  ['chess_rapid', 'Rapid'],
  ['chess_blitz', 'Blitz'],
  ['chess_bullet', 'Bullet'],
  ['chess_daily', 'Daily'],
] as const;

/** At most this many time controls are shown, so the table stays a glance. */
const MAX_RATINGS = 4;

/** https://lichess.org/api/user/<username> */
export function parseLichess(json: unknown): Rating[] {
  const perfs = record(record(json)?.perfs);
  if (!perfs) return [];

  const ratings: Rating[] = [];
  for (const [key, label] of LICHESS) {
    const perf = record(perfs[key]);
    const rating = ratingValue(perf?.rating);
    const games = wholeNumber(perf?.games);
    if (rating === null || !games) continue;
    ratings.push({ label, rating, games, ...(perf?.prov === true ? { provisional: true } : {}) });
  }
  return ratings.slice(0, MAX_RATINGS);
}

/** https://api.chess.com/pub/player/<username>/stats */
export function parseChessCom(json: unknown): Rating[] {
  const stats = record(json);
  if (!stats) return [];

  const ratings: Rating[] = [];
  for (const [key, label] of CHESS_COM) {
    const entry = record(stats[key]);
    const rating = ratingValue(record(entry?.last)?.rating);
    if (rating === null) continue;
    const result = record(entry?.record);
    const games = (wholeNumber(result?.win) ?? 0) + (wholeNumber(result?.loss) ?? 0) + (wholeNumber(result?.draw) ?? 0);
    ratings.push({ label, rating, ...(games > 0 ? { games } : {}) });
  }
  return ratings.slice(0, MAX_RATINGS);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function wholeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

/** No rating system in use goes anywhere near 5000; anything outside this is a bad response. */
function ratingValue(value: unknown): number | null {
  const rating = wholeNumber(value);
  return rating !== null && rating > 0 && rating < 5000 ? rating : null;
}
