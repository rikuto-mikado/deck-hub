import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { clockRules, setup } from './logic';

describe('clock solitaire', () => {
  it('plays itself out to a win or a loss, keeping all 52 cards', () => {
    let wins = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let s = setup(createRng(seed));
      while (clockRules.status(s) === 'playing') s = clockRules.reduce(s, { type: 'turn' });
      expect(s.piles.flat()).toHaveLength(52);
      if (clockRules.status(s) === 'won') wins++;
    }
    // Roughly 1 deal in 13 comes out.
    expect(wins).toBeGreaterThan(0);
    expect(wins).toBeLessThan(20);
  });
});
