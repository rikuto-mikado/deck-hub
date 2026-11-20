import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { accordionRules, anyMove, setup } from './logic';

describe('accordion', () => {
  it('compresses the line by legal moves and conserves cards', () => {
    let s = setup(createRng(5));
    expect(s.piles).toHaveLength(52);
    for (let m = anyMove(s); m; m = anyMove(s)) {
      const next = accordionRules.reduce(s, { type: 'move', ...m });
      expect(next.piles).toHaveLength(s.piles.length - 1);
      s = next;
    }
    expect(s.piles.flat()).toHaveLength(52);
    expect(accordionRules.status(s)).not.toBe('playing');
  });

  it('rejects moves of two places', () => {
    const s = setup(createRng(5));
    expect(accordionRules.reduce(s, { type: 'move', from: 5, to: 3 })).toBe(s);
  });
});
