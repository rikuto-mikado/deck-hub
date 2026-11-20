import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { bestCapture, canCapture, cardCaptureRules, setup } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('card capture', () => {
  it('splits the 54 cards into a starter deck and the dungeon', () => {
    const s = setup(createRng(1));
    expect(s.hand.length + s.deck.length).toBe(24);
    expect(s.enemies.length + s.dungeon.length).toBe(30);
  });

  it('captures with same-suit cards worth enough', () => {
    expect(canCapture(c('hearts', 9), [c('hearts', 5), c('hearts', 4)])).toBe(true);
    expect(canCapture(c('hearts', 9), [c('hearts', 5), c('spades', 4)])).toBe(false);
    expect(canCapture(c('hearts', 12), [c('hearts', 6), c('hearts', 5)])).toBe(false);
  });

  it('plays to an ending following its own advice', () => {
    let s = setup(createRng(11));
    for (let i = 0; i < 2000 && cardCaptureRules.status(s) === 'playing'; i++) {
      const cap = bestCapture(s);
      s = cardCaptureRules.reduce(s, cap ? { type: 'capture', ...cap } : { type: 'end' });
    }
    expect(cardCaptureRules.status(s)).not.toBe('playing');
  });
});
