import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canMove, setup } from './logic';

const up = (suit: Suit, rank: number, copy = 0) => makeCard(suit, rank as Rank, copy, true);

describe('forty thieves', () => {
  it('deals 10×4 from two decks with a 64-card stock', () => {
    const s = setup(createRng(2));
    expect(s.tableau.every((t) => t.length === 4)).toBe(true);
    expect(s.stock).toHaveLength(64);
    expect(s.foundations).toHaveLength(8);
  });

  it('builds down in suit, one card at a time unless playing Josephine', () => {
    const s = setup(createRng(2));
    s.tableau[0] = [up('hearts', 9), up('hearts', 8)];
    s.tableau[1] = [up('hearts', 10, 1)];
    s.tableau[2] = [up('spades', 10)];
    expect(canMove(s, 't0', 1, 't2')).toBe(false);
    expect(canMove(s, 't0', 0, 't1')).toBe(false);
    expect(canMove({ ...s, josephine: true }, 't0', 0, 't1')).toBe(true);
  });
});
