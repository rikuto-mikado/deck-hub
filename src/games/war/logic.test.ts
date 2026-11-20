import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { cardsOf, setup, warRules } from './logic';

describe('war', () => {
  it('splits the deck and keeps all 52 cards through a whole game', () => {
    for (const length of ['short', 'classic']) {
      let s = setup(createRng(9), { length });
      expect(cardsOf(s, 0)).toBe(26);
      for (let i = 0; i < 5000 && warRules.status(s) === 'playing'; i++) {
        s = warRules.reduce(s, s.phase === 'collect' ? { type: 'collect' } : { type: 'flip' });
        expect(cardsOf(s, 0) + cardsOf(s, 1)).toBe(52);
      }
      expect(warRules.status(s)).not.toBe('playing');
    }
  });
});
