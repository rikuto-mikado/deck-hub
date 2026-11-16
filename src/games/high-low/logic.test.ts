import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import type { Rank } from '@/core/types/card';
import { highLowRules, odds, type HighLowState } from './logic';

const c = (rank: number, copy = 0) => makeCard('spades', rank as Rank, copy, true);

describe('high-low', () => {
  it('scores right guesses, ignores ties, ends on a miss', () => {
    let s: HighLowState = { deck: [c(2), c(9), c(9, 1)], shown: [c(9, 2)], streak: 0, outcome: null };
    s = highLowRules.reduce(s, { type: 'guess', guess: 'higher' });
    expect(s.outcome).toBe('push');
    s = highLowRules.reduce(s, { type: 'guess', guess: 'lower' });
    expect(s.outcome).toBe('push');
    s = highLowRules.reduce(s, { type: 'guess', guess: 'lower' });
    expect(s.streak).toBe(1);
    expect(highLowRules.status(s)).toBe('won');
  });

  it('computes odds from unseen cards', () => {
    const s: HighLowState = { deck: [c(2), c(10), c(12)], shown: [c(5)], streak: 0, outcome: null };
    expect(odds(s).higher).toBeCloseTo(2 / 3);
  });
});
