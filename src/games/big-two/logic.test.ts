import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { HUMAN, beats, bigTwoRules, comboOf, cpuMove, setup } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('big two', () => {
  it('ranks 2♠ highest and compares five-card hands by category', () => {
    expect(beats(comboOf([c('spades', 2)])!, comboOf([c('hearts', 2)])!)).toBe(true);
    expect(beats(comboOf([c('diamonds', 2)])!, comboOf([c('spades', 1)])!)).toBe(true);
    const flush = comboOf([c('hearts', 3), c('hearts', 5), c('hearts', 7), c('hearts', 9), c('hearts', 11)])!;
    const straight = comboOf([c('hearts', 10), c('clubs', 11), c('hearts', 12), c('spades', 13), c('hearts', 1)])!;
    expect(beats(flush, straight)).toBe(true);
    expect(comboOf([c('hearts', 1), c('clubs', 2), c('hearts', 3), c('spades', 4), c('hearts', 5)])).toBeNull();
  });

  it('plays a full game', () => {
    let s = setup(createRng(6));
    for (let i = 0; i < 2000 && bigTwoRules.status(s) === 'playing'; i++)
      s = bigTwoRules.reduce(s, s.turn === HUMAN ? cpuMove(s, HUMAN, 'normal') : bigTwoRules.auto!(s)!.action);
    expect(bigTwoRules.status(s)).not.toBe('playing');
  });
});
