import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { HUMAN, actor, beats, cpuMove, durakRules, setup } from './logic';

describe('durak', () => {
  it('beats with a higher card of the suit or any trump', () => {
    const a = makeCard('hearts', 9, 0, true);
    expect(beats(a, makeCard('hearts', 10, 0, true), 'spades')).toBe(true);
    expect(beats(a, makeCard('hearts', 7, 0, true), 'spades')).toBe(false);
    expect(beats(a, makeCard('spades', 6, 0, true), 'spades')).toBe(true);
    expect(beats(a, makeCard('clubs', 1, 0, true), 'spades')).toBe(false);
  });

  it('plays games of 2–4 to the end without losing cards', () => {
    for (const players of ['2', '3', '4']) {
      let s = setup(createRng(Number(players) * 7), { players });
      const total = 36;
      for (let i = 0; i < 5000 && durakRules.status(s) === 'playing'; i++) {
        const p = actor(s)!;
        s = durakRules.reduce(s, p === HUMAN ? cpuMove(s, HUMAN) : durakRules.auto!(s)!.action);
        const onTable = s.table.reduce((n, x) => n + 1 + (x.defense ? 1 : 0), 0);
        expect(s.hands.flat().length + s.stock.length + s.discard + onTable).toBe(total);
      }
      expect(durakRules.status(s)).not.toBe('playing');
    }
  });
});
