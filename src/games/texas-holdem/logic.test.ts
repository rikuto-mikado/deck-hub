import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { HUMAN, cpuDecide, holdemRules, preflopStrength, setup, showdown, type HoldemState } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe("texas hold'em", () => {
  it('rates pocket aces above seven-deuce', () => {
    expect(preflopStrength([c('hearts', 1), c('spades', 1)])).toBeGreaterThan(preflopStrength([c('hearts', 7), c('clubs', 2)]));
  });

  it('splits side pots between the right players', () => {
    const s = { ...setup(createRng(1)) } as HoldemState;
    const st: HoldemState = {
      ...s,
      board: [c('hearts', 2), c('clubs', 7), c('diamonds', 9), c('spades', 12), c('hearts', 4)],
      hole: [
        [c('spades', 1), c('clubs', 1)], // aces: best
        [c('hearts', 13), c('clubs', 13)], // kings
        [c('diamonds', 3), c('diamonds', 5)],
        [c('clubs', 8), c('clubs', 6)],
      ],
      folded: [false, false, true, false],
      committed: [100, 300, 50, 300],
      dealer: 3,
    };
    const pays = showdown(st);
    const amount = (p: number) => pays.find((x) => x.seat === p)?.amount ?? 0;
    expect(amount(0)).toBe(100 * 3 + 50); // main pot
    expect(amount(1)).toBe(400); // side pot between the two who put in 300
    expect(amount(0) + amount(1) + amount(3)).toBe(750);
  });

  it.each(['4', '2'])('plays %s-seat hands with legal CPU actions and chips conserved', (seats) => {
    let s = setup(createRng(3), { seats, cpu: 'easy' });
    for (let i = 0; i < 1500 && holdemRules.status(s) === 'playing'; i++) {
      const before = s;
      if (s.phase === 'handOver') s = holdemRules.reduce(s, { type: 'next' });
      else if (s.turn === HUMAN) s = holdemRules.reduce(s, cpuDecide(s, HUMAN, 'easy').action);
      else s = holdemRules.reduce(s, holdemRules.auto!(s)!.action);
      expect(s, 'every action must be legal').not.toBe(before);
      const total =
        s.stacks.reduce((a, b) => a + b, 0) +
        (s.phase === 'handOver' || s.phase === 'matchOver' ? 0 : s.committed.reduce((a, b) => a + b, 0));
      expect(total).toBe(Number(seats) * 1000);
    }
  });
});
