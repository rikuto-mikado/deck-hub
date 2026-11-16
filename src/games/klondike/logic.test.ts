import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { bestTarget, canMove, canRecycle, klondikeRules, setup, type KlondikeState } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);
const down = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, false);

const empty = (): KlondikeState => ({
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  moves: 0,
  draw: 1,
  maxPasses: 0,
  pass: 1,
  scoring: 'standard',
  score: 0,
});

describe('klondike', () => {
  it('deals 28 to the tableau with only the last card face up', () => {
    const s = setup(createRng(9));
    expect(s.tableau.map((t) => t.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.tableau.every((t) => t.slice(0, -1).every((c) => !c.faceUp) && t.at(-1)!.faceUp)).toBe(true);
    expect(s.stock).toHaveLength(24);
  });

  it('builds down in alternating colors, moves runs and flips the exposed card', () => {
    const s = empty();
    s.tableau[0] = [down('clubs', 2), up('hearts', 9), up('spades', 8)];
    s.tableau[1] = [up('diamonds', 10)];
    expect(canMove(s, 't0', 1, 't1')).toBe(false); // red on red
    s.tableau[1] = [up('spades', 10)];
    expect(canMove(s, 't0', 1, 't1')).toBe(true);
    const after = klondikeRules.reduce(s, { type: 'move', from: 't0', index: 1, to: 't1' });
    expect(after.tableau[1]!.map((c) => c.rank)).toEqual([10, 9, 8]);
    expect(after.tableau[0]![0]!.faceUp).toBe(true);
  });

  it('only kings go to empty columns; aces start foundations', () => {
    const s = empty();
    s.waste = [up('hearts', 1)];
    s.tableau[0] = [up('clubs', 12)];
    expect(canMove(s, 't0', 0, 't1')).toBe(false);
    expect(bestTarget(s, 'waste', 0)).toBe('f0');
  });

  it('recycles the waste and auto-finishes', () => {
    const s = empty();
    s.waste = [up('hearts', 3), up('hearts', 4)];
    const r = klondikeRules.reduce(s, { type: 'draw' });
    expect(r.stock.map((c) => c.rank)).toEqual([4, 3]);
    const fin = empty();
    fin.foundations = [[up('hearts', 1)], [], [], []];
    fin.tableau[0] = [up('hearts', 2)];
    expect(klondikeRules.auto!(fin)?.action).toEqual({ type: 'move', from: 't0', index: 0, to: 'f0' });
  });
});

describe('klondike variants', () => {
  it('draws three at a time and limits passes', () => {
    let s = setup(createRng(9), { draw: '3', passes: '1' });
    s = klondikeRules.reduce(s, { type: 'draw' });
    expect(s.waste).toHaveLength(3);
    expect(s.stock).toHaveLength(21);
    for (let i = 0; i < 7; i++) s = klondikeRules.reduce(s, { type: 'draw' });
    expect(s.stock).toHaveLength(0);
    expect(canRecycle(s)).toBe(false);
    expect(klondikeRules.reduce(s, { type: 'draw' })).toBe(s);
  });

  it('scores Standard and Vegas moves', () => {
    const std = empty();
    std.waste = [up('hearts', 1)];
    std.tableau[0] = [down('clubs', 5), up('hearts', 2)];
    const a = klondikeRules.reduce(std, { type: 'move', from: 'waste', index: 0, to: 'f0' });
    expect(a.score).toBe(10);
    const b = klondikeRules.reduce({ ...a, waste: [] }, { type: 'move', from: 't0', index: 1, to: 'f0' });
    expect(b.score).toBe(10 + 10 + 5); // to foundation + flipped a card
    const vegas = setup(createRng(1), { scoring: 'vegas' });
    expect(vegas.score).toBe(-52);
  });

  it('charges 100 for recycling in draw-1 standard scoring', () => {
    const s = { ...empty(), waste: [up('hearts', 3)], score: 150 };
    expect(klondikeRules.reduce(s, { type: 'draw' }).score).toBe(50);
  });
});

describe('klondike hints', () => {
  it('prefers moves to the foundation, then moves that turn a card over', () => {
    const s = empty();
    s.tableau[0] = [down('clubs', 4), up('hearts', 9)];
    s.tableau[1] = [up('spades', 10)];
    s.tableau[2] = [up('diamonds', 1)];
    expect(klondikeRules.hint!(s)?.cards).toEqual([s.tableau[2]![0]!.id]);
    s.tableau[2] = [];
    expect(klondikeRules.hint!(s)?.cards).toEqual([s.tableau[0]![1]!.id, s.tableau[1]![0]!.id]);
  });

  it('reports stuck only when nothing can ever change', () => {
    const s = empty();
    s.tableau[0] = [down('clubs', 4), up('hearts', 9)];
    s.tableau[1] = [up('hearts', 10)];
    s.stock = [up('clubs', 5)];
    expect(klondikeRules.stuck!(s)).toBe(true);
    s.stock = [up('spades', 8)]; // could go on the red 9
    expect(klondikeRules.stuck!(s)).toBe(false);
  });
});
