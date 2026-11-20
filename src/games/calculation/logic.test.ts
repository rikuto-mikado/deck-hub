import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { calculationRules, needed, setup } from './logic';

describe('calculation', () => {
  it('starts A, 2, 3, 4 and steps by 1–4 with wrap', () => {
    const s = setup(createRng(1));
    expect(s.foundations.map((f) => f[0]!.rank)).toEqual([1, 2, 3, 4]);
    expect([0, 1, 2, 3].map((i) => needed(s, i))).toEqual([2, 4, 6, 8]);
    const q = { ...s, foundations: s.foundations.map((f, i) => (i === 1 ? [{ ...f[0]!, rank: 12 as const }] : f)) };
    expect(needed(q, 1)).toBe(1); // Q + 2 wraps to A
    expect(s.stock).toHaveLength(48);
  });

  it('keeps every card through a played-out game', () => {
    let s = setup(createRng(1));
    for (let i = 0; i < 400 && calculationRules.status(s) === 'playing'; i++) {
      const h = calculationRules.hint!(s);
      if (!s.current) s = calculationRules.reduce(s, { type: 'turn' });
      else {
        const f = [0, 1, 2, 3].find((k) => needed(s, k) === s.current!.rank);
        s = calculationRules.reduce(s, { type: 'place', to: f !== undefined ? `f${f}` : `w${i % 4}` });
      }
      expect(h === null || typeof h === 'object').toBe(true);
    }
    const count = s.foundations.flat().length + s.wastes.flat().length + s.stock.length + (s.current ? 1 : 0);
    expect(count).toBe(52);
  });
});
