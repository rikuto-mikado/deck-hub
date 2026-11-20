import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { baccaratRules, handTotal, nextDraw, payout, setup } from './logic';

const c = (rank: number) => makeCard('hearts', rank as Rank, 0, true);

describe('baccarat', () => {
  it('counts the last digit and follows the third-card tableau', () => {
    expect(handTotal([c(9), c(13), c(5)])).toBe(4);
    expect(nextDraw({ player: [c(9), c(13)], banker: [c(2), c(3)] })).toBeNull(); // natural
    expect(nextDraw({ player: [c(2), c(3)], banker: [c(10), c(7)] })).toBe('player');
    expect(nextDraw({ player: [c(3), c(3)], banker: [c(10), c(4)] })).toBe('banker'); // player stood on 6
    expect(nextDraw({ player: [c(2), c(1), c(8)], banker: [c(1), c(2)] })).toBeNull(); // banker 3 vs third 8
    expect(nextDraw({ player: [c(2), c(1), c(6)], banker: [c(3), c(3)] })).toBe('banker'); // banker 6 vs 6
  });

  it('pays Banker minus commission and pushes side bets on a tie', () => {
    expect(payout('banker', 100, 'banker')).toBe(195);
    expect(payout('player', 100, 'tie')).toBe(100);
    expect(payout('tie', 20, 'tie')).toBe(180);
  });

  it('plays a coup to settlement', () => {
    let s = baccaratRules.reduce(setup(createRng(2)), { type: 'deal' });
    for (let step = baccaratRules.auto!(s); step; step = baccaratRules.auto!(s)) s = baccaratRules.reduce(s, step.action);
    expect(s.phase).toBe('settled');
    expect(s.road).toHaveLength(1);
  });
});
