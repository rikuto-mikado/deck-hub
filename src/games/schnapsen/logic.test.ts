import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, legal, schnapsenRules, setup, toAct } from './logic';

describe('schnapsen', () => {
  it('deals 5 each from 20 cards and plays a match to 7', () => {
    let s = setup(createRng(3));
    expect(s.hands[0]).toHaveLength(5);
    expect(s.talon).toHaveLength(9);
    for (let i = 0; i < 5000 && schnapsenRules.status(s) === 'playing'; i++) {
      if (s.phase === 'dealOver') s = schnapsenRules.reduce(s, { type: 'next' });
      else if (toAct(s) === HUMAN) s = schnapsenRules.reduce(s, { type: 'play', by: HUMAN, id: legal(s, HUMAN)[0]!.id });
      else s = schnapsenRules.reduce(s, schnapsenRules.auto!(s)!.action);
    }
    expect(schnapsenRules.status(s)).not.toBe('playing');
    expect(Math.max(...s.gamePoints)).toBeGreaterThanOrEqual(7);
  });
});
