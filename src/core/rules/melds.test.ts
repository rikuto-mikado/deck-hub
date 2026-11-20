import { describe, expect, it } from 'vitest';
import { makeCard } from '../deck/createDeck';
import type { Rank, Suit } from '../types/card';
import { bestMelds, layOff } from './melds';

const c = (suit: Suit, rank: number, copy = 0) => makeCard(suit, rank as Rank, copy, true);

describe('melds', () => {
  it('chooses the partition with least deadwood when sets and runs overlap', () => {
    // 7♥ fits both the run 5–6–7♥ and the set of 7s; the best split uses it in the run.
    const hand = [
      c('hearts', 5),
      c('hearts', 6),
      c('hearts', 7),
      c('spades', 7),
      c('clubs', 7),
      c('diamonds', 7),
      c('clubs', 13),
    ];
    const r = bestMelds(hand);
    expect(r.points).toBe(10);
    expect(r.melds).toHaveLength(2);
  });

  it('lays off onto runs and sets', () => {
    const melds = [
      [c('hearts', 5), c('hearts', 6), c('hearts', 7)],
      [c('spades', 9), c('clubs', 9), c('diamonds', 9)],
    ];
    const r = layOff(melds, [c('hearts', 8), c('hearts', 9), c('hearts', 9, 1), c('clubs', 2)]);
    expect(r.deadwood.map((x) => x.rank)).toEqual([2]);
  });
});
