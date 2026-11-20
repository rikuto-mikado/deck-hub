import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { acesUpRules, canDiscard, setup, type AcesUpState } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('aces up', () => {
  it('deals four cards and a 48-card stock', () => {
    const s = setup(createRng(1));
    expect(s.piles.map((p) => p.length)).toEqual([1, 1, 1, 1]);
    expect(s.stock).toHaveLength(48);
    expect(acesUpRules.reduce(s, { type: 'deal' }).stock).toHaveLength(44);
  });

  it('discards a lower card of a suit and treats Aces as high', () => {
    const s: AcesUpState = { piles: [[c('hearts', 13)], [c('hearts', 1)], [c('spades', 5)], []], stock: [], discard: [] };
    expect(canDiscard(s, 0)).toBe(true);
    expect(canDiscard(s, 1)).toBe(false);
    expect(canDiscard(s, 2)).toBe(false);
    expect(acesUpRules.reduce(s, { type: 'discard', pile: 1 })).toBe(s);
  });

  it('wins with only the four Aces left', () => {
    const s: AcesUpState = {
      piles: [[c('hearts', 1)], [c('spades', 1)], [c('clubs', 1)], [c('diamonds', 1)]],
      stock: [],
      discard: [],
    };
    expect(acesUpRules.status(s)).toBe('won');
  });
});
