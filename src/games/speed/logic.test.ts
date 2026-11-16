import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, movesFor, setup, speedRules } from './logic';

describe('speed', () => {
  it('splits colors 26/26 and starts both center piles', () => {
    const s = setup(createRng(1));
    expect(s.fields[0].every((c) => c && (c.suit === 'hearts' || c.suit === 'diamonds'))).toBe(true);
    expect(s.center[0]).toHaveLength(1);
    expect(s.center[1]).toHaveLength(1);
    expect(s.stocks[0].length + 4 + 1).toBe(26);
  });

  it('always reaches a result', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = setup(createRng(seed));
      for (let i = 0; i < 2000 && speedRules.status(s) === 'playing'; i++) {
        const mine = movesFor(s, HUMAN)[0];
        const step = speedRules.auto!(s);
        const human = mine ? { type: 'play' as const, by: HUMAN, ...mine } : undefined;
        const action = i % 2 ? (human ?? step?.action) : (step?.action ?? human);
        if (!action) break;
        s = speedRules.reduce(s, action);
      }
      expect(speedRules.status(s)).not.toBe('playing');
    }
  });
});
