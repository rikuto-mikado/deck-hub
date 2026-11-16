import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, oldMaidRules, setup, targetOf } from './logic';

describe('old maid', () => {
  it('deals 53 cards and removes pairs', () => {
    const s = setup(createRng(1));
    const total = s.hands.reduce((n, h) => n + h.length, 0) + s.discard.length;
    expect(total).toBe(53);
    for (const h of s.hands) {
      const ranks = h.filter((c) => c.kind === 'standard').map((c) => (c.kind === 'standard' ? c.rank : 0));
      expect(new Set(ranks).size).toBe(ranks.length);
    }
  });

  it('plays to the end with exactly one Joker holder left', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = setup(createRng(seed));
      for (let i = 0; i < 500 && s.hands.filter((h) => h.length).length > 1; i++) {
        const step = oldMaidRules.auto!(s);
        s = step ? oldMaidRules.reduce(s, step.action) : oldMaidRules.reduce(s, { type: 'draw', by: HUMAN, index: 0 });
        if (s.finished.includes(HUMAN) && !step) break;
        if (s.finished.includes(HUMAN)) break;
      }
      expect(oldMaidRules.status(s)).not.toBe('playing');
      if (oldMaidRules.status(s) === 'lost') {
        expect(s.hands[HUMAN]!.map((c) => c.kind)).toEqual(['joker']);
      }
      expect(targetOf(s, HUMAN)).toBeTypeOf('number');
    }
  });
});
