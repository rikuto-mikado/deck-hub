import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { LINES, pokerSquaresRules, setup, totalScore } from './logic';

describe('poker squares', () => {
  it('has 12 scoring lines and fills the grid in 25 placements', () => {
    expect(LINES).toHaveLength(12);
    let s = setup(createRng(4));
    expect(s.deck).toHaveLength(25);
    for (let i = 0; i < 25; i++) s = pokerSquaresRules.reduce(s, { type: 'place', cell: i });
    expect(s.grid.every(Boolean)).toBe(true);
    expect(pokerSquaresRules.status(s)).not.toBe('playing');
    expect(totalScore(s)).toBeGreaterThanOrEqual(0);
  });

  it('refuses an occupied square', () => {
    const s = pokerSquaresRules.reduce(setup(createRng(4)), { type: 'place', cell: 3 });
    expect(pokerSquaresRules.reduce(s, { type: 'place', cell: 3 })).toBe(s);
  });

  it('greedy hints beat placing cards in order', () => {
    let a = setup(createRng(8)),
      b = a;
    for (let i = 0; i < 25; i++) {
      b = pokerSquaresRules.reduce(b, { type: 'place', cell: i });
      const msg = pokerSquaresRules.hint!(a)!.message!;
      const [, r, c] = msg.match(/row (\d), column (\d)/)!.map(Number);
      a = pokerSquaresRules.reduce(a, { type: 'place', cell: (r! - 1) * 5 + c! - 1 });
    }
    expect(totalScore(a)).toBeGreaterThan(totalScore(b));
  });
});
