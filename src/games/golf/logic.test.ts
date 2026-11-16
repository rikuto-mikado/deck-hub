import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { canPlay, golfRules, golfScore, type GolfState } from './logic';

const c = (suit: 'spades' | 'hearts', rank: number) => makeCard(suit, rank as never, 0, true);

describe('golf', () => {
  it('deals 7×5 + 16 stock + 1 waste', () => {
    const s = golfRules.setup(createRng(1));
    expect(s.columns.map((x) => x.length)).toEqual([5, 5, 5, 5, 5, 5, 5]);
    expect(s.stock).toHaveLength(16);
    expect(s.waste).toHaveLength(1);
  });

  it('plays only ±1 without wrapping', () => {
    const s: GolfState = {
      columns: [[c('spades', 6)], [c('hearts', 13)]],
      stock: [],
      waste: [c('hearts', 5)],
      wrap: false,
      kingStops: false,
    };
    const after = golfRules.reduce(s, { type: 'play', column: 0 });
    expect(after.waste.at(-1)?.rank).toBe(6);
    const kingOnAce: GolfState = {
      columns: [[c('spades', 13)]],
      stock: [],
      waste: [c('hearts', 1)],
      wrap: false,
      kingStops: false,
    };
    expect(golfRules.reduce(kingOnAce, { type: 'play', column: 0 })).toBe(kingOnAce);
    expect(golfRules.status(kingOnAce)).toBe('lost');
    expect(golfRules.status(after)).toBe('lost');
  });
});

describe('golf options and scoring', () => {
  it('wraps K↔A when enabled and blocks plays on a King when enabled', () => {
    const base: GolfState = {
      columns: [[c('spades', 1)], [c('spades', 12)]],
      stock: [],
      waste: [c('hearts', 13)],
      wrap: false,
      kingStops: false,
    };
    expect(canPlay(base, 0)).toBe(false);
    expect(canPlay({ ...base, wrap: true }, 0)).toBe(true);
    expect(canPlay(base, 1)).toBe(true);
    expect(canPlay({ ...base, kingStops: true }, 1)).toBe(false);
  });

  it('scores minus the stock left when the columns are cleared', () => {
    const s: GolfState = { columns: [[], []], stock: [c('spades', 2), c('spades', 3)], waste: [], wrap: false, kingStops: false };
    expect(golfScore(s)).toBe(-2);
  });
});
