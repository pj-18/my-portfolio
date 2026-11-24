/**
 * The Chess section's data: ratings (fetched, or the manual ones in content/chess.md) and the
 * favourite game, replayed at build time so the browser never needs a chess engine.
 */
import { z } from 'astro/zod';
import { Chess } from 'chess.js';
import { frontmatter as chessFrontmatter } from '../../content/chess.md';
import pgnSource from '../../content/favourite-game.pgn?raw';
import type { PieceId } from '../assets/chess/pieces.ts';
import type { ChessData, Rating } from './chess-ratings.ts';
import { chessPlatform, chessUrl, site } from './site.ts';

// ── Settings from content/chess.md ───────────────────────────────────────────────────────

const settingsSchema = z.object({
  ratings: z
    .array(z.object({ label: z.string().min(1), rating: z.number().int().positive() }))
    .default([]),
  game: z
    .object({
      note: z.string().default(''),
      startPly: z.number().int().min(0).optional(),
      orientation: z.enum(['white', 'black']).default('white'),
    })
    .default({ note: '', orientation: 'white' }),
});

const parsedSettings = settingsSchema.safeParse(chessFrontmatter);
if (!parsedSettings.success) {
  throw new Error(`The front matter of content/chess.md is not valid:\n${z.prettifyError(parsedSettings.error)}`);
}
const settings = parsedSettings.data;

// ── Ratings ──────────────────────────────────────────────────────────────────────────────

export interface Ratings {
  ratings: Rating[];
  /** "live" when fetched from the platform, "manual" when read from content/chess.md. */
  source: 'live' | 'manual';
  platform: string;
  profileUrl: string | null;
  fetchedAt: string | null;
}

const generated = import.meta.glob<ChessData>('/src/generated/chess.json', { eager: true, import: 'default' });

export function getRatings(): Ratings {
  const data = Object.values(generated)[0];
  const live = data && data.username === site.chess.username && data.platform === site.chess.platform && data.ratings.length > 0;
  return {
    ratings: live ? data.ratings : settings.ratings,
    source: live ? 'live' : 'manual',
    platform: chessPlatform,
    profileUrl: chessUrl,
    fetchedAt: live ? data.fetchedAt : null,
  };
}

// ── Favourite game ───────────────────────────────────────────────────────────────────────

export interface GameMove {
  /** e.g. "16. Qb8+" or "15… Nxd7" */
  label: string;
  san: string;
  number: number;
  white: boolean;
  from: string;
  to: string;
}

export interface Game {
  white: string;
  black: string;
  /** Event, place and year, whichever the PGN supplies. */
  details: string[];
  result: string;
  /** A link to the game online, when the PGN carries one. */
  link: string | null;
  note: string;
  flipped: boolean;
  /** Whose turn it is in the first position (matters when the PGN is a position with no moves). */
  whiteStarts: boolean;
  moves: GameMove[];
  /** Piece placement (the first field of a FEN) before any move, then after each one. */
  positions: string[];
  /** Which position to show first. */
  startPly: number;
  /** Every piece that appears at some point, so the page defines each drawing once. */
  pieces: PieceId[];
}

const known = (value: string | null | undefined): string => {
  const trimmed = (value ?? '').trim();
  return trimmed && !/^\?+$/.test(trimmed) ? trimmed : '';
};

const RESULTS: Record<string, string> = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½' };

function buildGame(): Game {
  const chess = new Chess();
  try {
    chess.loadPgn(pgnSource);
  } catch (error) {
    throw new Error(`content/favourite-game.pgn could not be read as a chess game: ${error instanceof Error ? error.message : String(error)}`);
  }

  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });
  const placement = (fen: string) => fen.split(' ')[0]!;

  const positions = history.length > 0 ? [placement(history[0]!.before), ...history.map((move) => placement(move.after))] : [placement(chess.fen())];

  const moves: GameMove[] = history.map((move) => {
    const number = Number(move.before.split(' ')[5]) || 1;
    const white = move.color === 'w';
    return { label: `${number}${white ? '.' : '…'} ${move.san}`, san: move.san, number, white, from: move.from, to: move.to };
  });

  const pieces = new Set<PieceId>();
  for (const position of positions) {
    for (const letter of position.replace(/[^a-zA-Z]/g, '')) {
      pieces.add(`${letter === letter.toUpperCase() ? 'w' : 'b'}${letter.toUpperCase()}` as PieceId);
    }
  }

  const year = /^\d{4}/.exec(known(headers.Date) || known(headers.UTCDate))?.[0] ?? '';
  const place = known(headers.Site);
  const link = [known(headers.Link), place].find((value) => /^https:\/\//.test(value)) ?? null;

  return {
    white: known(headers.White) || 'White',
    black: known(headers.Black) || 'Black',
    details: [known(headers.Event), /^https?:\/\//.test(place) ? '' : place, year].filter(Boolean),
    result: RESULTS[known(headers.Result)] ?? '',
    link,
    note: settings.game.note,
    flipped: settings.game.orientation === 'black',
    whiteStarts: (history[0]?.color ?? chess.turn()) === 'w',
    moves,
    positions,
    startPly: Math.min(settings.game.startPly ?? moves.length, moves.length),
    pieces: [...pieces].sort(),
  };
}

let game: Game | undefined;

export function getGame(): Game {
  game ??= buildGame();
  return game;
}

/** Where each piece stands, as board coordinates with (0, 0) at the top left of the diagram. */
export function squares(placement: string, flipped: boolean): { piece: PieceId; x: number; y: number }[] {
  const out: { piece: PieceId; x: number; y: number }[] = [];
  placement.split('/').forEach((row, rank) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }
      const piece = `${char === char.toUpperCase() ? 'w' : 'b'}${char.toUpperCase()}` as PieceId;
      out.push({ piece, x: flipped ? 7 - file : file, y: flipped ? 7 - rank : rank });
      file += 1;
    }
  });
  return out;
}

/** "e4" -> board coordinates, matching `squares`. */
export function squareXY(square: string, flipped: boolean): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - Number(square[1]);
  return { x: flipped ? 7 - file : file, y: flipped ? 7 - rank : rank };
}
