import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canMove, setup, yukonRules, type YukonState } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('yukon', () => {
  it('deals 1, 6, 7 … 11 cards with five face up', () => {
    const s = setup(createRng(3));
    expect(s.tableau.map((t) => t.length)).toEqual([1, 6, 7, 8, 9, 10, 11]);
    expect(s.tableau[6]!.filter((c) => c.faceUp)).toHaveLength(5);
  });

  it('moves a buried face-up card with an unordered load', () => {
    const s: YukonState = {
      tableau: [[up('hearts', 9), up('clubs', 2), up('diamonds', 13)], [up('spades', 10)], [], [], [], [], []],
      foundations: [[], [], [], []],
      moves: 0,
    };
    expect(canMove(s, 't0', 0, 't1')).toBe(true);
    const next = yukonRules.reduce(s, { type: 'move', from: 't0', index: 0, to: 't1' });
    expect(next.tableau[1]).toHaveLength(4);
    expect(canMove(s, 't0', 1, 't2')).toBe(false); // only Kings into an empty column
    expect(canMove(s, 't0', 2, 't2')).toBe(true);
  });
});
