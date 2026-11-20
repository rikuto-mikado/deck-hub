import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { trickWinner } from '@/core/rules/trickTaking';
import { HUMAN, cpuBid, cpuMove, euchreRules, powerIn, setup, suitIn, toAct } from './logic';

describe('euchre', () => {
  it('ranks the bowers above the trump Ace', () => {
    const trick = [
      { by: 0, card: makeCard('hearts', 1, 0, true) },
      { by: 1, card: makeCard('diamonds', 11, 0, true) },
      { by: 2, card: makeCard('hearts', 13, 0, true) },
    ];
    expect(trickWinner(trick, 'hearts', { suitOf: suitIn('hearts'), power: powerIn('hearts') }).by).toBe(1);
  });

  it('plays a match through bidding, alone hands and scoring', () => {
    let s = setup(createRng(8), { target: '5' });
    expect(s.hands.every((h) => h.length === 5)).toBe(true);
    for (let i = 0; i < 5000 && euchreRules.status(s) === 'playing'; i++) {
      if (s.phase === 'handOver') s = euchreRules.reduce(s, { type: 'next' });
      else if (s.phase === 'discard') s = euchreRules.reduce(s, { type: 'discard', id: s.hands[HUMAN]![0]!.id });
      else if ((s.phase === 'order1' || s.phase === 'order2') && s.turn === HUMAN) s = euchreRules.reduce(s, cpuBid(s, HUMAN));
      else if (toAct(s) === HUMAN) s = euchreRules.reduce(s, { type: 'play', by: HUMAN, id: cpuMove(s, HUMAN).id });
      else s = euchreRules.reduce(s, euchreRules.auto!(s)!.action);
    }
    expect(euchreRules.status(s)).not.toBe('playing');
  });
});
