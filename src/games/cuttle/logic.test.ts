import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { CPU, HUMAN, cpuAct, cuttleRules, goalOf, pointsOf, setup, targetsOf } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('cuttle', () => {
  it('lowers the goal with kings and protects with queens', () => {
    const s = setup(createRng(1));
    const t = {
      ...s,
      perms: [
        [c('spades', 13), c('hearts', 13)],
        [c('clubs', 12), c('clubs', 8)],
      ] as [never[], never[]],
    };
    expect(goalOf(t, HUMAN)).toBe(10);
    expect(targetsOf(t, 'perm', CPU)).toEqual([c('clubs', 12).id]);
  });

  it('a 2 counters a one-off and the chain resolves', () => {
    let s = setup(createRng(1));
    s = { ...s, hands: [[c('hearts', 1)], [c('spades', 2)]], points: [{ card: c('clubs', 9), owner: CPU, jacks: [] }] };
    s = cuttleRules.reduce(s, { type: 'oneoff', by: HUMAN, id: c('hearts', 1).id });
    expect(s.phase).toBe('counter');
    s = cuttleRules.reduce(s, { type: 'counter', by: CPU, id: c('spades', 2).id });
    s = cuttleRules.reduce(s, { type: 'resolve', by: HUMAN });
    expect(pointsOf(s, CPU)).toBe(9); // the Ace was countered
    expect(s.turn).toBe(CPU);
  });

  it('two CPUs play a full game', () => {
    let s = setup(createRng(7));
    for (let i = 0; i < 2000 && cuttleRules.status(s) === 'playing'; i++) {
      const p = s.phase === 'main' ? s.turn : s.actor;
      const before = s;
      s = cuttleRules.reduce(s, p === HUMAN ? cpuAct(s, 'normal', HUMAN) : cuttleRules.auto!(s)!.action);
      expect(s).not.toBe(before);
      const total =
        s.hands.flat().length +
        s.deck.length +
        s.scrap.length +
        s.perms.flat().length +
        s.points.reduce((n, pc) => n + 1 + pc.jacks.length, 0) +
        (s.pending ? 1 + s.pending.chain.length : 0) +
        (s.revealed ? 1 : 0);
      expect(total).toBe(52);
    }
    expect(cuttleRules.status(s)).not.toBe('playing');
  });
});
