import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { adjacent, monteCarloRules, pairs, setup } from './logic';

describe('monte carlo', () => {
  it('knows its neighbours, including diagonals', () => {
    expect(adjacent(0, 6)).toBe(true);
    expect(adjacent(4, 5)).toBe(false); // row wrap is not adjacent
    expect(adjacent(12, 18)).toBe(true);
  });

  it('removes pairs, consolidates and never loses a card', () => {
    let s = setup(createRng(21));
    for (let i = 0; i < 200 && monteCarloRules.status(s) === 'playing'; i++) {
      const p = pairs(s)[0];
      if (p) {
        s = monteCarloRules.reduce(s, { type: 'select', cell: p[0] });
        s = monteCarloRules.reduce(s, { type: 'select', cell: p[1] });
      } else s = monteCarloRules.reduce(s, { type: 'consolidate' });
      expect(s.grid.filter(Boolean).length + s.stock.length + s.removed.length).toBe(52);
    }
    expect(monteCarloRules.status(s)).not.toBe('playing');
  });
});
