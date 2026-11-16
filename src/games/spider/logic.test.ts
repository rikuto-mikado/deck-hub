import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { canMove, setup, spiderRules, type SpiderState } from './logic';

describe('spider', () => {
  it('deals 54 to the tableau and keeps 50 in stock', () => {
    const s = setup(createRng(2));
    expect(s.tableau.reduce((n, t) => n + t.length, 0)).toBe(54);
    expect(s.stock).toHaveLength(50);
  });

  it('moves suited runs onto any suit and clears a full run', () => {
    const run = Array.from({ length: 12 }, (_, i) => makeCard('spades', (13 - i) as Rank, 0, true)); // K..2
    const base: SpiderState = {
      tableau: [
        [makeCard('hearts', 5 as Rank, 1, false), ...run],
        [makeCard('spades', 1 as Rank, 0, true)],
        ...Array.from({ length: 8 }, () => [makeCard('hearts', 9 as Rank, 0, true)]),
      ],
      stock: [],
      done: [],
      moves: 0,
    };
    expect(canMove(base, 1, 0, 0)).toBe(true);
    const after = spiderRules.reduce(base, { type: 'move', from: 1, index: 0, to: 0 });
    expect(after.done).toHaveLength(1);
    expect(after.tableau[0]).toHaveLength(1);
    expect(after.tableau[0]![0]!.faceUp).toBe(true);
  });

  it('refuses to deal onto an empty column', () => {
    const s = setup(createRng(2));
    const blocked = { ...s, tableau: s.tableau.map((t, i) => (i === 0 ? [] : t)) };
    expect(spiderRules.reduce(blocked, { type: 'deal' })).toBe(blocked);
  });
});

describe('spider suits option', () => {
  it.each([
    ['1', 1],
    ['2', 2],
    ['4', 4],
  ])('%s suit(s)', (opt, n) => {
    const s = setup(createRng(1), { suits: opt });
    const all = [...s.stock, ...s.tableau.flat()];
    expect(all).toHaveLength(104);
    expect(new Set(all.map((c) => c.suit)).size).toBe(n);
    expect(new Set(all.map((c) => c.id)).size).toBe(104);
  });
});
