import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { blackjackRules, canSplit, canSurrender, handValue, setup, type BlackjackState } from './logic';

let copy = 100;
const c = (rank: number) => makeCard('clubs', rank as Rank, copy++, true);

/** Stacks the shoe so cards come out in the given order (player, dealer up, player, hole, then hits). */
function stacked(order: number[], options = {}): BlackjackState {
  const s = setup(createRng(8), options);
  return { ...s, bet: 10, shoe: [...s.shoe.slice(0, 200), ...order.map(c).toReversed()] };
}

const run = (s: BlackjackState, ...actions: Parameters<typeof blackjackRules.reduce>[1][]) => {
  for (const a of actions) s = blackjackRules.reduce(s, a);
  while (s.phase === 'dealer') s = blackjackRules.reduce(s, blackjackRules.auto!(s)!.action);
  return s;
};

describe('blackjack', () => {
  it('counts soft and hard totals', () => {
    expect(handValue([c(1), c(6)])).toEqual({ total: 17, soft: true });
    expect(handValue([c(1), c(6), c(10)])).toEqual({ total: 17, soft: false });
    expect(handValue([c(1), c(1), c(9)])).toEqual({ total: 21, soft: true });
  });

  it('dealer draws to 17 and the higher hand wins', () => {
    const s = run(stacked([10, 9, 10, 7, 5]), { type: 'deal' }, { type: 'stand' });
    expect(handValue(s.dealer).total).toBe(21);
    expect(s.hands[0]!.outcome).toBe('lose');
    expect(s.chips).toBe(990);
  });

  it('pays 3:2 on a natural, or 6:5 when configured', () => {
    expect(run(stacked([1, 9, 13, 5]), { type: 'deal' }).chips).toBe(1015);
    expect(run(stacked([1, 9, 13, 5], { payout: '6:5' }), { type: 'deal' }).chips).toBe(1012);
  });

  it('splits into two hands, doubles after split, and settles each', () => {
    // P 8, D 6, P 8, hole 10; split → hand1 gets 3 (11) → double gets 10 (21); hand2 gets 10 (18) stand; dealer 16 draws 9 → bust
    let s = blackjackRules.reduce(stacked([8, 6, 8, 10, 3, 10, 10, 9]), { type: 'deal' });
    expect(canSplit(s)).toBe(true);
    s = run(s, { type: 'split' }, { type: 'double' }, { type: 'stand' });
    expect(s.hands).toHaveLength(2);
    expect(s.hands.map((h) => h.outcome)).toEqual(['win', 'win']);
    // Staked 10 + 10 (split) + 10 (double) = 30; the doubled hand returns 40, the other 20.
    expect(s.chips).toBe(1000 - 30 + 40 + 20);
  });

  it('split Aces get one card each and 21 is not a blackjack', () => {
    const s = run(stacked([1, 9, 1, 7, 13, 5, 10]), { type: 'deal' }, { type: 'split' });
    expect(s.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    // Dealer 9 + 7 = 16 draws the 10 and busts; the split 21 pays even money, not 3:2.
    expect(s.hands[0]!.outcome).toBe('win');
    expect(s.hands[0]!.payout).toBe(20);
  });

  it('offers insurance against an Ace and pays 2:1 on dealer blackjack', () => {
    let s = blackjackRules.reduce(stacked([10, 1, 9, 13]), { type: 'deal' });
    expect(s.phase).toBe('insurance');
    s = blackjackRules.reduce(s, { type: 'insurance', take: true });
    expect(s.phase).toBe('settled');
    expect(s.hands[0]!.outcome).toBe('lose');
    expect(s.chips).toBe(1000 - 10 - 5 + 15);
  });

  it('late surrender returns half the bet; H17 makes the dealer hit soft 17', () => {
    let s = blackjackRules.reduce(stacked([10, 9, 6, 7]), { type: 'deal' });
    expect(canSurrender(s)).toBe(true);
    s = run(s, { type: 'surrender' });
    expect(s.chips).toBe(995);
    const h17 = run(
      stacked([10, 1, 9, 6, 2], { dealer: 'h17' }),
      { type: 'deal' },
      { type: 'insurance', take: false },
      { type: 'stand' },
    );
    expect(handValue(h17.dealer).total).toBe(19);
    const s17 = run(stacked([10, 1, 9, 6, 2]), { type: 'deal' }, { type: 'insurance', take: false }, { type: 'stand' });
    expect(handValue(s17.dealer).total).toBe(17);
  });
});

import { basicStrategy } from './logic';

const advise = (player: number[], up: number) => {
  const s = setup(createRng(1));
  return basicStrategy({
    ...s,
    phase: 'player',
    bet: 10,
    chips: 990,
    dealer: [c(up), { ...c(5), faceUp: false }],
    hands: [
      {
        cards: player.map((r) => c(r)),
        bet: 10,
        doubled: false,
        done: false,
        surrendered: false,
        split: false,
        outcome: null,
        payout: 0,
      },
    ],
    active: 0,
  });
};

describe('blackjack basic strategy', () => {
  it('stands on 13 vs a 6, hits vs a 10, doubles 11, splits 8s', () => {
    expect(advise([10, 3], 6)).toBe('Stand');
    expect(advise([10, 3], 10)).toBe('Hit');
    expect(advise([6, 5], 7)).toBe('Double');
    expect(advise([8, 8], 10)).toBe('Split');
    expect(advise([10, 6], 10)).toBe('Surrender');
  });
});
