import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { HUMAN, cpuMove, isGroup, setup, yanivRules } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('yaniv', () => {
  it('recognises sets and runs', () => {
    expect(isGroup([c('hearts', 5), c('clubs', 5)])).toBe(true);
    expect(isGroup([c('hearts', 5), c('hearts', 6), c('hearts', 7)])).toBe(true);
    expect(isGroup([c('hearts', 5), c('hearts', 6)])).toBe(false);
    expect(isGroup([c('hearts', 5), c('clubs', 6), c('hearts', 7)])).toBe(false);
  });

  it('plays a match through Yaniv and Assaf calls', () => {
    let s = setup(createRng(2), { limit: '100' });
    for (let i = 0; i < 20000 && yanivRules.status(s) === 'playing'; i++) {
      if (s.phase === 'roundOver') s = yanivRules.reduce(s, { type: 'next' });
      else if (s.turn === HUMAN) s = yanivRules.reduce(s, cpuMove(s, HUMAN));
      else s = yanivRules.reduce(s, yanivRules.auto!(s)!.action);
      expect(s.hands.flat().length + s.stock.length + s.pile.length + s.top.length + (s.pending?.length ?? 0)).toBe(54);
    }
    expect(yanivRules.status(s)).not.toBe('playing');
  });
});
