import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuDoubts, cpuPlay, doubtRules, pendingResponder, setup } from './logic';

describe('doubt', () => {
  it('plays to a winner without losing cards', () => {
    let s = setup(createRng(4));
    for (let i = 0; i < 20000 && doubtRules.status(s) === 'playing'; i++) {
      if (pendingResponder(s) === HUMAN) s = doubtRules.reduce(s, { type: 'respond', by: HUMAN, doubt: cpuDoubts(s, HUMAN) });
      else if (s.phase === 'play' && s.turn === HUMAN)
        s = doubtRules.reduce(s, { type: 'play', by: HUMAN, ids: cpuPlay(s, HUMAN) });
      else s = doubtRules.reduce(s, doubtRules.auto!(s)!.action);
      expect(s.hands.flat().length + s.pile.length).toBe(52);
    }
    expect(doubtRules.status(s)).not.toBe('playing');
  });

  it('a liar picks up the pile when doubted', () => {
    let s = setup(createRng(4));
    const lie = s.hands[HUMAN]!.find((c) => c.rank !== 1)!;
    s = doubtRules.reduce(s, { type: 'play', by: HUMAN, ids: [lie.id] });
    s = doubtRules.reduce(s, { type: 'respond', by: 1, doubt: true });
    s = doubtRules.reduce(s, { type: 'resolve' });
    expect(s.hands[HUMAN]).toHaveLength(13);
    expect(s.rank).toBe(2);
  });
});
