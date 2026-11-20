import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canfieldRules, fitsHome, isRun, setup } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('canfield', () => {
  it('deals a 13-card reserve, a base card and four columns', () => {
    const s = setup(createRng(5));
    expect(s.reserve).toHaveLength(13);
    expect(s.foundations[0]![0]!.rank).toBe(s.base);
    expect(s.tableau.every((t) => t.length === 1)).toBe(true);
    expect(s.stock).toHaveLength(34);
  });

  it('wraps foundations K → A and columns A → K', () => {
    const s = { ...setup(createRng(5)), base: 12 };
    expect(fitsHome(s, up('hearts', 1), [up('hearts', 12), up('hearts', 13)])).toBe(true);
    expect(isRun([up('hearts', 1), up('spades', 13)])).toBe(true);
  });

  it('refills an emptied column from the reserve', () => {
    let s = setup(createRng(5));
    s = { ...s, tableau: [[], ...s.tableau.slice(1)] };
    s.foundations[1] = [];
    const card = s.tableau[1]![0]!;
    s = { ...s, base: card.rank };
    const next = canfieldRules.reduce(s, { type: 'move', from: 't1', index: 0, to: 'f1' });
    expect(next.tableau[1]).toHaveLength(1);
    expect(next.tableau[0]).toHaveLength(1); // both empty columns are refilled
    expect(next.reserve).toHaveLength(11);
  });
});
