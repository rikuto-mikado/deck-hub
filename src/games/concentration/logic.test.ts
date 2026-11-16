import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { CPU, HUMAN, concentrationRules, cpuPick, setup } from './logic';

describe('concentration', () => {
  it('keeps the turn on a match and passes it on a miss', () => {
    const s = setup(createRng(1));
    const a = 0;
    const b = s.cards.findIndex((c, i) => i !== a && c.rank === s.cards[a]!.rank);
    const miss = s.cards.findIndex((c) => c.rank !== s.cards[a]!.rank);
    let m = concentrationRules.reduce(s, { type: 'flip', by: HUMAN, index: a });
    m = concentrationRules.reduce(m, { type: 'flip', by: HUMAN, index: b });
    m = concentrationRules.reduce(m, { type: 'resolve' });
    expect(m.pairs).toEqual([1, 0]);
    expect(m.turn).toBe(HUMAN);
    let x = concentrationRules.reduce(s, { type: 'flip', by: HUMAN, index: a });
    x = concentrationRules.reduce(x, { type: 'flip', by: HUMAN, index: miss });
    x = concentrationRules.reduce(x, { type: 'resolve' });
    expect(x.turn).toBe(CPU);
    expect(x.cards[a]!.faceUp).toBe(false);
  });

  it('plays a full game against itself to completion', () => {
    let s = setup(createRng(2));
    for (let i = 0; i < 2000 && concentrationRules.status(s) === 'playing'; i++) {
      const step = concentrationRules.auto!(s);
      s = step
        ? concentrationRules.reduce(s, step.action)
        : concentrationRules.reduce(s, { type: 'flip', by: HUMAN, index: cpuPick(s) });
    }
    expect(s.pairs[0] + s.pairs[1]).toBe(26);
  });
});
