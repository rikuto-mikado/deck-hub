import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { videoPokerRules, winFor } from './logic';

describe('video poker', () => {
  it('deals, holds, draws and pays', () => {
    let s = videoPokerRules.setup(createRng(4));
    s = videoPokerRules.reduce(s, { type: 'deal' });
    expect(s.phase).toBe('hold');
    expect(s.credits).toBe(95);
    const kept = s.hand[0]!;
    s = videoPokerRules.reduce(s, { type: 'toggle', index: 0 });
    s = videoPokerRules.reduce(s, { type: 'draw' });
    expect(s.phase).toBe('result');
    expect(s.hand[0]).toEqual(kept);
    expect(new Set(s.hand.map((c) => c.id)).size).toBe(5);
    expect(s.credits).toBe(95 + s.lastWin);
  });

  it('pays the royal bonus only at max bet', () => {
    expect(winFor('royal-flush', 5)).toBe(4000);
    expect(winFor('royal-flush', 4)).toBe(1000);
    expect(winFor('jacks-or-better', 3)).toBe(3);
  });
});

import { makeCard } from '@/core/deck/createDeck';
import type { Rank, Suit } from '@/core/types/card';
import { holdAdvice } from './logic';

const h = (spec: string) =>
  spec.split(' ').map((t, i) => {
    const suit = ({ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' } as Record<string, Suit>)[t.at(-1)!]!;
    const r = t.slice(0, -1);
    return makeCard(suit, (({ A: 1, J: 11, Q: 12, K: 13 } as Record<string, number>)[r] ?? Number(r)) as Rank, i, true);
  });

describe('video poker hold advice', () => {
  it.each([
    ['Ah Kh Qh Jh 10h', [0, 1, 2, 3, 4]],
    ['Js Jd 4c 7h 9s', [0, 1]],
    ['Ah Kh Qh Jh 3c', [0, 1, 2, 3]],
    ['2h 7h 9h Kh 4c', [0, 1, 2, 3]],
    ['5s 5d 9c Jh 2s', [0, 1]],
    ['Kh Qs 4c 7d 2s', [0, 1]],
    ['2c 4d 7h 9s 3s', []],
  ])('%s → hold %j', (hand, keep) => {
    expect(holdAdvice(h(hand)).toSorted()).toEqual(keep.toSorted());
  });
});
