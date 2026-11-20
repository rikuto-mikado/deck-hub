import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { HUMAN, canPlayOn, cpuMove, palaceRules, setup } from './logic';

const c = (rank: number) => makeCard('hearts', rank as Rank, 0, true);

describe('palace', () => {
  it('applies 2, 7 and 10 rules', () => {
    expect(canPlayOn([c(9)], c(8))).toBe(false);
    expect(canPlayOn([c(9)], c(10))).toBe(true);
    expect(canPlayOn([c(13)], c(2))).toBe(true);
    expect(canPlayOn([c(2)], c(3))).toBe(true);
    expect(canPlayOn([c(7)], c(9))).toBe(false);
    expect(canPlayOn([c(7)], c(5))).toBe(true);
    expect(canPlayOn([c(13)], c(1))).toBe(true);
  });

  it('plays a full game with no lost cards', () => {
    let s = palaceRules.reduce(setup(createRng(8)), { type: 'ready' });
    for (let i = 0; i < 5000 && palaceRules.status(s) === 'playing'; i++) {
      s = palaceRules.reduce(s, s.turn === HUMAN ? cpuMove(s, HUMAN) : palaceRules.auto!(s)!.action);
      const total = [s.hands, s.up, s.down].flat(2).length + s.stock.length + s.pile.length + s.burned;
      expect(total).toBe(52);
    }
    expect(palaceRules.status(s)).not.toBe('playing');
  });
});
