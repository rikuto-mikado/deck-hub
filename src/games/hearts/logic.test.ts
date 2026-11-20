import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove, cpuPass, heartsRules, setup, toAct } from './logic';

function playOut(seed: number, opts = {}) {
  let s = setup(createRng(seed), opts);
  for (let i = 0; i < 5000 && heartsRules.status(s) === 'playing'; i++) {
    if (s.phase === 'pass') s = heartsRules.reduce(s, { type: 'pass', ids: cpuPass(s, HUMAN).map((c) => c.id) });
    else if (s.phase === 'handOver') s = heartsRules.reduce(s, { type: 'next' });
    else if (toAct(s) === HUMAN) s = heartsRules.reduce(s, { type: 'play', by: HUMAN, id: cpuMove(s, HUMAN).id });
    else s = heartsRules.reduce(s, heartsRules.auto!(s)!.action);
  }
  return s;
}

describe('hearts', () => {
  it('deals 13 each and the 2♣ leads', () => {
    const s = setup(createRng(1), { passing: 'off' });
    expect(s.hands.every((h) => h.length === 13)).toBe(true);
    expect(s.phase).toBe('play');
    expect(s.hands[s.leader]!.some((c) => c.suit === 'clubs' && c.rank === 2)).toBe(true);
  });

  it('plays a whole match; every hand distributes 26 points (or a moon)', () => {
    const s = playOut(4, { target: '50' });
    expect(heartsRules.status(s)).not.toBe('playing');
    expect(s.scores.reduce((a, b) => a + b, 0) % 26).toBe(0);
  });
});
