import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { fitsRow, osmosisRules, setup, targetRow } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('osmosis', () => {
  it('lets ranks percolate down only once they are in the row above', () => {
    const s = { ...setup(createRng(1)), base: 5 };
    s.rows = [[up('hearts', 5), up('hearts', 9)], [up('spades', 5)], [], []];
    expect(fitsRow(s, up('hearts', 2), 0)).toBe(true);
    expect(fitsRow(s, up('spades', 9), 1)).toBe(true);
    expect(fitsRow(s, up('spades', 2), 1)).toBe(false);
    expect(fitsRow(s, up('clubs', 5), 2)).toBe(true);
    expect(fitsRow(s, up('clubs', 5), 3)).toBe(false);
  });

  it('plays out a game without losing cards and ends', () => {
    let s = setup(createRng(4));
    for (let i = 0; i < 3000 && osmosisRules.status(s) === 'playing'; i++) {
      const from = ['r0', 'r1', 'r2', 'r3', 'waste'].find((f) => {
        const c = f === 'waste' ? s.waste.at(-1) : s.reserves[Number(f.slice(1))]!.at(-1);
        return c && targetRow(s, c) >= 0;
      });
      if (from) {
        const c = from === 'waste' ? s.waste.at(-1)! : s.reserves[Number(from.slice(1))]!.at(-1)!;
        s = osmosisRules.reduce(s, { type: 'play', from, row: targetRow(s, c) });
      } else s = osmosisRules.reduce(s, { type: 'draw' });
    }
    expect(osmosisRules.status(s)).not.toBe('playing');
    expect(s.rows.flat().length + s.reserves.flat().length + s.stock.length + s.waste.length).toBe(52);
  });
});
