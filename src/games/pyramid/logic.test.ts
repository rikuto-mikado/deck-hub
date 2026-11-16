import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { available, isExposed, pyramidRules, rowCol, setup, type PyramidState } from './logic';

describe('pyramid', () => {
  it('maps indices to rows', () => {
    expect(rowCol(0)).toEqual([0, 0]);
    expect(rowCol(2)).toEqual([1, 1]);
    expect(rowCol(27)).toEqual([6, 6]);
  });

  it('exposes only the bottom row at start', () => {
    const s = setup(createRng(3));
    expect(s.pyramid.filter((_, i) => isExposed(s, i))).toHaveLength(7);
    expect(s.stock).toHaveLength(24);
  });

  it('removes pairs summing to 13 and kings alone', () => {
    const s = setup(createRng(3));
    const pyramid = s.pyramid.slice();
    pyramid[21] = makeCard('spades', 13 as Rank, 0, true);
    pyramid[22] = makeCard('hearts', 6 as Rank, 0, true);
    pyramid[23] = makeCard('clubs', 7 as Rank, 0, true);
    const st: PyramidState = { ...s, pyramid };
    const k = pyramidRules.reduce(st, { type: 'remove', ids: [pyramid[21]!.id] });
    expect(k.pyramid[21]).toBeNull();
    const pair = pyramidRules.reduce(k, { type: 'remove', ids: [pyramid[22]!.id, pyramid[23]!.id] });
    expect(pair.pyramid[22]).toBeNull();
    expect(pair.pyramid[23]).toBeNull();
    expect(available(pair).some((c) => c.id === pyramid[15]!.id)).toBe(true);
    // illegal: covered card
    expect(pyramidRules.reduce(st, { type: 'remove', ids: [pyramid[0]!.id] })).toBe(st);
  });
});
