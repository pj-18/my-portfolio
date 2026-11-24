import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseChessCom, parseLichess } from '../src/lib/chess-ratings.ts';

test('Lichess: keeps played time controls in display order and marks provisional ratings', () => {
  const ratings = parseLichess({
    username: 'someone',
    perfs: {
      bullet: { games: 7484, rating: 1807, rd: 100, prog: 22 },
      blitz: { games: 11926, rating: 1745, rd: 50, prog: -4 },
      rapid: { games: 922, rating: 1836, rd: 68, prog: 13 },
      classical: { games: 25, rating: 1858, rd: 250, prog: 48, prov: true },
      correspondence: { games: 0, rating: 1500, rd: 500, prog: 0, prov: true },
      puzzle: { games: 4000, rating: 2100, rd: 60, prog: 0 },
    },
  });
  assert.deepEqual(ratings, [
    { label: 'Rapid', rating: 1836, games: 922 },
    { label: 'Blitz', rating: 1745, games: 11926 },
    { label: 'Bullet', rating: 1807, games: 7484 },
    { label: 'Classical', rating: 1858, games: 25, provisional: true },
  ]);
});

test('Chess.com: reads the latest rating and counts games from the record', () => {
  const ratings = parseChessCom({
    chess_daily: { last: { rating: 1239, date: 1770563021, rd: 103 }, record: { win: 7, loss: 1, draw: 0 } },
    chess_rapid: { last: { rating: 1638, date: 1786796329, rd: 44 }, best: { rating: 1727 }, record: { win: 205, loss: 69, draw: 20 } },
    chess_blitz: { last: { rating: 1470, date: 1794369739, rd: 30 }, record: { win: 30, loss: 50, draw: 4 } },
    tactics: { highest: { rating: 2400 } },
  });
  assert.deepEqual(ratings, [
    { label: 'Rapid', rating: 1638, games: 294 },
    { label: 'Blitz', rating: 1470, games: 84 },
    { label: 'Daily', rating: 1239, games: 8 },
  ]);
});

test('unexpected responses give an empty list instead of throwing', () => {
  for (const junk of [null, undefined, 'nope', 42, [], {}, { perfs: null }, { perfs: { rapid: { rating: 'high', games: 3 } } }]) {
    assert.deepEqual(parseLichess(junk), []);
  }
  for (const junk of [null, 'nope', {}, { chess_rapid: {} }, { chess_rapid: { last: { rating: Number.NaN } } }]) {
    assert.deepEqual(parseChessCom(junk), []);
  }
});
