import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove, estimateBid, forbiddenBid, ohHellRules, setup, toAct } from './logic';

describe('oh hell', () => {
  it('enforces the hook and plays every round', () => {
    let s = setup(createRng(6));
    for (let i = 0; i < 5000 && ohHellRules.status(s) === 'playing'; i++) {
      if (s.phase === 'roundOver') s = ohHellRules.reduce(s, { type: 'next' });
      else if (s.phase === 'bid' && s.turn === HUMAN) {
        const hook = forbiddenBid(s, HUMAN);
        if (hook !== null) expect(ohHellRules.reduce(s, { type: 'bid', by: HUMAN, bid: hook })).toBe(s);
        s = ohHellRules.reduce(s, { type: 'bid', by: HUMAN, bid: estimateBid(s, HUMAN) });
      } else if (toAct(s) === HUMAN) s = ohHellRules.reduce(s, { type: 'play', by: HUMAN, id: cpuMove(s, HUMAN).id });
      else s = ohHellRules.reduce(s, ohHellRules.auto!(s)!.action);
      if (s.phase === 'play' && s.trick.length === 0 && s.tricks.every((t) => t === 0))
        expect(s.bids.reduce<number>((n, b) => n + b!, 0)).not.toBe(s.schedule[s.round]);
    }
    expect(ohHellRules.status(s)).not.toBe('playing');
    expect(s.round).toBe(12);
  });
});
