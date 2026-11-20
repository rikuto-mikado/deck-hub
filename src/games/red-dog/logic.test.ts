import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { redDogRules, setup, spreadOf } from './logic';

const c = (rank: number) => makeCard('spades', rank as Rank, 0, true);

describe('red dog', () => {
  it('measures the spread with Aces high', () => {
    expect(spreadOf(c(5), c(6))).toBe(0);
    expect(spreadOf(c(9), c(9))).toBe(-1);
    expect(spreadOf(c(2), c(1))).toBe(11);
    expect(spreadOf(c(4), c(8))).toBe(3);
  });

  it('plays hands until settled and keeps the chips consistent', () => {
    let s = setup(createRng(7));
    for (let hand = 0; hand < 20 && redDogRules.status(s) === 'playing'; hand++) {
      s = redDogRules.reduce(s, { type: 'deal' });
      if (s.phase === 'raise') s = redDogRules.reduce(s, { type: 'stand' });
      if (s.phase === 'third') s = redDogRules.reduce(s, { type: 'third' });
      expect(s.phase).toBe('settled');
      expect(s.chips).toBeGreaterThanOrEqual(0);
    }
  });
});
