import { describe, expect, it } from 'vitest';
import { makeCard } from '../deck/createDeck';
import type { Rank, Suit } from '../types/card';
import { legalMoves, trickWinner } from './trickTaking';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('trickTaking', () => {
  it('forces following suit and allows anything when void', () => {
    const hand = [c('spades', 2), c('hearts', 5), c('hearts', 9)];
    expect(legalMoves(hand, 'hearts').map((x) => x.rank)).toEqual([5, 9]);
    expect(legalMoves(hand, 'clubs')).toHaveLength(3);
  });

  it('holds back an unbroken suit on the lead unless nothing else remains', () => {
    expect(legalMoves([c('hearts', 2), c('clubs', 3)], null, { unbrokenSuit: 'hearts' })).toHaveLength(1);
    expect(legalMoves([c('hearts', 2)], null, { unbrokenSuit: 'hearts' })).toHaveLength(1);
  });

  it('picks the highest trump, else the highest card of the led suit', () => {
    const trick = [
      { by: 0, card: c('hearts', 10) },
      { by: 1, card: c('hearts', 1) },
      { by: 2, card: c('spades', 2) },
      { by: 3, card: c('clubs', 13) },
    ];
    expect(trickWinner(trick, null).by).toBe(1);
    expect(trickWinner(trick, 'spades').by).toBe(2);
  });
});
