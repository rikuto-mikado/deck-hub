import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { CPU, HUMAN, cpuAct, ginRules, setup } from './logic';

describe('gin rummy', () => {
  it('plays a whole match with both seats using the CPU strategy', () => {
    let s = setup(createRng(9), { target: '50' });
    expect(s.hands[0]).toHaveLength(10);
    for (let i = 0; i < 20000 && ginRules.status(s) === 'playing'; i++) {
      if (s.phase === 'handOver') s = ginRules.reduce(s, { type: 'next' });
      else if (s.turn === HUMAN) s = ginRules.reduce(s, cpuAct(s, 'hard'));
      else s = ginRules.reduce(s, ginRules.auto!(s)!.action);
      expect(s.hands[HUMAN].length + s.hands[CPU].length + s.stock.length + s.discard.length).toBe(52);
    }
    expect(ginRules.status(s)).not.toBe('playing');
  });
});
