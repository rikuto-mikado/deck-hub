import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove, estimateBid, setup, spadesRules, toAct } from './logic';

describe('spades', () => {
  it('bids, plays and finishes a match', () => {
    let s = setup(createRng(2), { target: '300' });
    for (let i = 0; i < 20000 && spadesRules.status(s) === 'playing'; i++) {
      if (s.phase === 'handOver') s = spadesRules.reduce(s, { type: 'next' });
      else if (s.phase === 'bid' && s.turn === HUMAN)
        s = spadesRules.reduce(s, { type: 'bid', by: HUMAN, bid: estimateBid(s, HUMAN) });
      else if (toAct(s) === HUMAN) s = spadesRules.reduce(s, { type: 'play', by: HUMAN, id: cpuMove(s, HUMAN).id });
      else s = spadesRules.reduce(s, spadesRules.auto!(s)!.action);
    }
    expect(spadesRules.status(s)).not.toBe('playing');
  });
});
