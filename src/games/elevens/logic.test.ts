import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { elevensRules, findSet, isSet, setup } from './logic';

const c = (rank: number) => makeCard('clubs', rank as Rank, 0, true);

describe('elevens', () => {
  it('recognises elevens and court trios', () => {
    expect(isSet([c(1), c(10)])).toBe(true);
    expect(isSet([c(5), c(6)])).toBe(true);
    expect(isSet([c(11), c(13), c(12)])).toBe(true);
    expect(isSet([c(11), c(11), c(13)])).toBe(false);
  });

  it('replaces cleared cards from the stock and conserves the deck', () => {
    let s = setup(createRng(12));
    for (let set = findSet(s); set; set = findSet(s)) {
      for (const card of set) s = elevensRules.reduce(s, { type: 'select', cell: s.grid.findIndex((g) => g?.id === card.id) });
      expect(s.grid.filter(Boolean).length + s.stock.length + s.removed.length).toBe(52);
    }
    expect(elevensRules.status(s)).not.toBe('playing');
  });
});
