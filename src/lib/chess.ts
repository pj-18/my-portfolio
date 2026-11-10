import { Chess } from 'chess.js';
import pgn from '../content/chess/favourite-game.pgn?raw';

/* ------------------------------ ratings ------------------------------ */

interface Provider<T> {
  fetchedAt: string;
  formats: Record<string, T>;
}
interface RatingData {
  chesscom: Provider<{ rating: number; best: number | null; games: number }> | null;
  lichess: Provider<{ rating: number; games: number; provisional: boolean }> | null;
}

const files = import.meta.glob<RatingData>('../data/{cache,fallback}/chess.json', { eager: true, import: 'default' });
const data = files['../data/cache/chess.json'] ?? files['../data/fallback/chess.json'] ?? null;

/** Lichess ratings from a handful of games are noise; hide them below this. */
const MIN_LICHESS_GAMES = 10;

export interface RatingRow {
  format: string;
  chesscom: number | null;
  best: number | null;
  /** Formatted: provisional Lichess ratings carry a trailing "?". */
  lichess: string | null;
}

const FORMATS: [key: string, label: string][] = [
  ['rapid', 'Rapid'],
  ['blitz', 'Blitz'],
  ['bullet', 'Bullet'],
  ['daily', 'Daily'],
];

export const ratings: RatingRow[] = FORMATS.map(([key, label]) => {
  const cc = data?.chesscom?.formats[key];
  const li = data?.lichess?.formats[key];
  return {
    format: label,
    chesscom: cc?.rating ?? null,
    best: cc?.best ?? null,
    lichess: li && li.games >= MIN_LICHESS_GAMES ? `${li.rating}${li.provisional ? '?' : ''}` : null,
  };
}).filter((row) => row.chesscom !== null || row.lichess !== null);

export const hasProvisional = ratings.some((row) => row.lichess?.endsWith('?'));
export const ratingsFetchedAt = data?.chesscom?.fetchedAt ?? data?.lichess?.fetchedAt ?? null;

/* -------------------------------- game -------------------------------- */

export interface Ply {
  /** 1-based half-move number. */
  ply: number;
  san: string;
  color: 'w' | 'b';
  from: string;
  to: string;
  /** Piece placement after this move: the first field of a FEN string. */
  placement: string;
}

function parseGame() {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });

  const plies: Ply[] = history.map((move, index) => ({
    ply: index + 1,
    san: move.san,
    color: move.color,
    from: move.from,
    to: move.to,
    placement: move.after.split(' ')[0]!,
  }));

  const [year, month, day] = (headers.Date ?? '').split('.');
  const date = year && month && day && !`${year}${month}${day}`.includes('?') ? `${year}-${month}-${day}` : null;

  return {
    white: { name: headers.White ?? 'White', elo: headers.WhiteElo ?? null },
    black: { name: headers.Black ?? 'Black', elo: headers.BlackElo ?? null },
    result: headers.Result ?? '*',
    opening: headers.Opening ?? null,
    eco: headers.ECO ?? null,
    date,
    url: headers.Link ?? null,
    start: (history[0]?.before ?? chess.fen()).split(' ')[0]!,
    plies,
    endsInMate: chess.isCheckmate(),
  };
}

export const game = parseGame();

/** "39...Rb1#" or "12. O-O" */
export const plyLabel = (ply: Pick<Ply, 'ply' | 'color' | 'san'>) =>
  `${Math.ceil(ply.ply / 2)}${ply.color === 'w' ? '. ' : '...'}${ply.san}`;
