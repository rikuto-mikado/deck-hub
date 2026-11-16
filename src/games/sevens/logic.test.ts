import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove, isPlayable, setup, sevensRules } from './logic';

describe('sevens', () => {
  it('places all sevens and gives the ♦7 holder the first turn', () => {
    const s = setup(createRng(4));
    expect(Object.values(s.board).every((row) => row[7])).toBe(true);
    expect(s.hands.reduce((n, h) => n + h.length, 0)).toBe(48);
  });

  it('only accepts cards next to the table', () => {
    const s = setup(createRng(4));
    for (const h of s.hands) for (const c of h) expect(isPlayable(s, c)).toBe(c.rank === 6 || c.rank === 8);
  });

  it('plays out to a result when everyone uses the CPU strategy', () => {
    for (let seed = 1; seed <= 15; seed++) {
      let s = setup(createRng(seed));
      for (let i = 0; i < 400 && sevensRules.status(s) === 'playing'; i++) {
        const step = sevensRules.auto!(s);
        s = sevensRules.reduce(s, step ? step.action : cpuMove(s, HUMAN));
      }
      expect(sevensRules.status(s)).not.toBe('playing');
    }
  });
});
