import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { HUMAN, chooseDiscard, cpuPlay, cribbageRules, setup } from './logic';
import { peggingPoints, scoreCribbageHand } from './scoring';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('cribbage scoring', () => {
  it('counts the famous 29 hand', () => {
    const hand = [c('hearts', 5), c('clubs', 5), c('diamonds', 5), c('spades', 11)];
    expect(scoreCribbageHand(hand, c('spades', 5)).total).toBe(29);
  });

  it('counts double runs and flushes', () => {
    const r = scoreCribbageHand([c('hearts', 3), c('clubs', 4), c('hearts', 4), c('spades', 5)], c('diamonds', 9));
    expect(r.items.find((i) => i.label.includes('runs'))!.points).toBe(6);
    expect(
      scoreCribbageHand([c('hearts', 2), c('hearts', 4), c('hearts', 6), c('hearts', 8)], c('clubs', 13), true).items.some((i) =>
        i.label.includes('flush'),
      ),
    ).toBe(false);
  });

  it('pegs fifteens, pairs and runs', () => {
    expect(peggingPoints([c('hearts', 7), c('clubs', 8)]).map((i) => i.points)).toEqual([2]);
    expect(peggingPoints([c('hearts', 4), c('clubs', 6), c('clubs', 5)]).map((i) => i.label)).toEqual(['fifteen', 'run of 3']);
  });

  it('plays a match to the end', () => {
    let s = setup(createRng(4), { target: '61' });
    for (let i = 0; i < 5000 && cribbageRules.status(s) === 'playing'; i++) {
      if (s.phase === 'discard')
        s = cribbageRules.reduce(s, {
          type: 'discard',
          ids: chooseDiscard(s.hands[HUMAN], s.dealer === HUMAN, 'normal').map((x) => x.id),
        });
      else if (s.phase === 'show') s = cribbageRules.reduce(s, { type: 'next' });
      else if (s.turn === HUMAN) s = cribbageRules.reduce(s, cpuPlay(s, HUMAN));
      else s = cribbageRules.reduce(s, cribbageRules.auto!(s)!.action);
    }
    expect(cribbageRules.status(s)).not.toBe('playing');
  });
});
