import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { isFree, setup } from './logic';

describe('crazy quilt', () => {
  it('deals a 64-card quilt, 8 foundations and a 32-card stock', () => {
    const s = setup(createRng(3));
    expect(s.quilt).toHaveLength(64);
    expect(s.stock).toHaveLength(32);
    expect(s.foundations.map((f) => f[0]!.rank)).toEqual([1, 1, 1, 1, 13, 13, 13, 13]);
  });

  it('frees upright cards at the top and bottom edges and sideways cards at the sides', () => {
    const s = setup(createRng(3));
    expect(isFree(s, 0)).toBe(true); // upright, top edge
    expect(isFree(s, 1)).toBe(false); // sideways, flanked by cards
    expect(isFree(s, 8)).toBe(true); // sideways, left edge
    expect(isFree(s, 9)).toBe(false); // upright, cards above and below
    s.quilt[1] = null;
    expect(isFree(s, 9)).toBe(true);
  });
});
