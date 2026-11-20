import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { YOU, emissaryRules, legal, setup } from './logic';

describe('the emissary', () => {
  it('deals 8 cards each from the 40 number cards and plays four fiefdoms', () => {
    let s = setup(createRng(3));
    expect(s.hand).toHaveLength(8);
    expect(s.court).toHaveLength(8);
    expect(s.demands.every((d) => d >= 2 && d <= 6)).toBe(true);
    for (let i = 0; i < 400 && emissaryRules.status(s) === 'playing'; i++) {
      const step = emissaryRules.auto!(s);
      if (step) s = emissaryRules.reduce(s, step.action);
      else if (s.phase === 'roundOver') s = emissaryRules.reduce(s, { type: 'next' });
      else s = emissaryRules.reduce(s, { type: 'play', by: YOU, id: legal(s, YOU)[0]!.id });
    }
    expect(emissaryRules.status(s)).not.toBe('playing');
    expect(s.results.every((r) => r !== null)).toBe(true);
  });

  it('allies work once per fiefdom', () => {
    const s = setup(createRng(3));
    const a = emissaryRules.reduce(s, { type: 'ally', ally: 'scout', id: s.hand[0]!.id });
    expect(a.hand).toHaveLength(8);
    expect(a.hand.some((c) => c.id === s.hand[0]!.id)).toBe(false);
    expect(emissaryRules.reduce(a, { type: 'ally', ally: 'scout', id: a.hand[0]!.id })).toBe(a);
  });
});
