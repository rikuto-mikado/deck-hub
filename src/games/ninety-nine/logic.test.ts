import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { HUMAN, apply, cpuMove, ninetyNineRules, setup } from './logic';

const c = (rank: number) => makeCard('clubs', rank as Rank, 0, true);

describe('ninety-nine', () => {
  it('applies the special cards', () => {
    expect(apply(50, c(13))).toBe(99);
    expect(apply(95, c(9))).toBe(95);
    expect(apply(95, c(10), 'low')).toBe(85);
    expect(apply(95, c(10), 'high')).toBeNull();
    expect(apply(90, c(1), 'low')).toBe(91);
    expect(apply(99, c(13))).toBe(99);
  });

  it('plays until one player is left', () => {
    let s = setup(createRng(3));
    for (let i = 0; i < 20000 && ninetyNineRules.status(s) === 'playing'; i++) {
      if (s.turn === HUMAN && s.busted === null) s = ninetyNineRules.reduce(s, cpuMove(s, HUMAN));
      else s = ninetyNineRules.reduce(s, ninetyNineRules.auto!(s)!.action);
    }
    expect(ninetyNineRules.status(s)).not.toBe('playing');
  });
});
