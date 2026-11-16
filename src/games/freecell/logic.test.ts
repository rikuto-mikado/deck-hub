import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canMove, freeCellRules, maxRun, setup, type FreeCellState } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);
const empty = (): FreeCellState => ({
  cells: [null, null, null, null],
  foundations: [[], [], [], []],
  tableau: Array.from({ length: 8 }, () => []),
  moves: 0,
});

describe('freecell', () => {
  it('deals 7,7,7,7,6,6,6,6 face up', () => {
    const s = setup(createRng(11));
    expect(s.tableau.map((t) => t.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
  });

  it('limits run length by free cells and empty columns', () => {
    const s = empty();
    s.tableau = s.tableau.map(() => [up('clubs', 2)]);
    s.cells = [up('hearts', 13), up('hearts', 12), null, null];
    expect(maxRun(s, 't0')).toBe(3);
    s.tableau[7] = [];
    expect(maxRun(s, 't0')).toBe(6);
    expect(maxRun(s, 't7')).toBe(3); // target column doesn't count
  });

  it('moves runs onto alternating colors and auto-plays safe cards', () => {
    const s = empty();
    s.tableau[0] = [up('spades', 9), up('hearts', 8), up('clubs', 7)];
    s.tableau[1] = [up('diamonds', 10)];
    expect(canMove(s, 't0', 0, 't1')).toBe(true);
    const a = empty();
    a.tableau[0] = [up('hearts', 1)];
    expect(freeCellRules.auto!(a)?.action).toEqual({ type: 'move', from: 't0', index: 0, to: 'f0' });
  });
});
