import { describe, expect, it } from 'vitest';
import { makeCard } from '../deck/createDeck';
import type { Rank, Suit } from '../types/card';
import { evaluateHand } from './pokerHands';

const h = (spec: string) =>
  spec.split(' ').map((t, i) => {
    const suit = ({ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' } as Record<string, Suit>)[t.at(-1)!]!;
    const r = t.slice(0, -1);
    const rank = ({ A: 1, J: 11, Q: 12, K: 13 } as Record<string, number>)[r] ?? Number(r);
    return makeCard(suit, rank as Rank, i);
  });

describe('evaluateHand', () => {
  it.each([
    ['10s Js Qs Ks As', 'royal-flush'],
    ['As 2s 3s 4s 5s', 'straight-flush'],
    ['9h 9s 9d 9c 2s', 'four-of-a-kind'],
    ['3h 3s 3d 7c 7s', 'full-house'],
    ['2h 7h 9h Jh Kh', 'flush'],
    ['10h Js Qd Kc As', 'straight'],
    ['Ah 2s 3d 4c 5s', 'straight'],
    ['Qh Ks Ad 2c 3s', 'high-card'],
    ['5h 5s 5d Jc 2s', 'three-of-a-kind'],
    ['5h 5s Jd Jc 2s', 'two-pair'],
  ])('%s → %s', (hand, cat) => {
    expect(evaluateHand(h(hand)).category).toBe(cat);
  });

  it('reports the pair rank with Ace high', () => {
    expect(evaluateHand(h('Ah As 3d 7c 9s')).pairRank).toBe(14);
  });
});
