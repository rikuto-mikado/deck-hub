import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canMove, setup } from './logic';

const up = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('beleaguered castle', () => {
  it('puts the Aces home and deals eight wings of six', () => {
    const s = setup(createRng(6));
    expect(s.foundations.every((f) => f[0]!.rank === 1)).toBe(true);
    expect(s.rows.every((r) => r.length === 6)).toBe(true);
  });

  it('builds down regardless of suit', () => {
    const s = setup(createRng(6));
    s.rows[0] = [up('hearts', 7)];
    s.rows[1] = [up('hearts', 8)];
    s.rows[2] = [];
    expect(canMove(s, 0, 'r1')).toBe(true);
    expect(canMove(s, 1, 'r0')).toBe(false);
    expect(canMove(s, 1, 'r2')).toBe(true);
  });
});
