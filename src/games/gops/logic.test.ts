import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, gopsRules, setup } from './logic';

describe('gops', () => {
  it('runs thirteen rounds and hands out the prize points (91 in all, minus a final tie)', () => {
    let s = setup(createRng(2));
    while (gopsRules.status(s) === 'playing') {
      s = gopsRules.reduce(s, { type: 'bid', id: s.hands[HUMAN][0]!.id });
      s = gopsRules.reduce(s, { type: 'resolve' });
    }
    expect(s.scores[0] + s.scores[1] + s.pot.reduce((n, c) => n + c.rank, 0)).toBe(91);
  });

  it('the CPU bid never depends on your card', () => {
    const s = setup(createRng(2));
    const a = gopsRules.reduce(s, { type: 'bid', id: s.hands[HUMAN][0]!.id });
    const b = gopsRules.reduce(s, { type: 'bid', id: s.hands[HUMAN][12]!.id });
    expect(a.bids[1]!.id).toBe(b.bids[1]!.id);
  });
});
