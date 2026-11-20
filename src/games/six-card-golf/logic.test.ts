import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank } from '@/core/types/card';
import { HUMAN, cpuMove, gridScore, setup, sixGolfRules } from './logic';

const c = (rank: number, copy = 0) => makeCard('spades', rank as Rank, copy, true);

describe('six-card golf', () => {
  it('cancels matching columns', () => {
    expect(gridScore([c(5), c(13), c(2), c(5, 1), c(1), c(12)])).toBe(0 + 1 - 2 + 10);
  });

  it('plays all holes', () => {
    let s = setup(createRng(3), { holes: '5' });
    s = sixGolfRules.reduce(s, { type: 'reveal', cells: [0, 4] });
    for (let i = 0; i < 4000 && sixGolfRules.status(s) === 'playing'; i++) {
      if (s.phase === 'reveal') s = sixGolfRules.reduce(s, { type: 'reveal', cells: [0, 4] });
      else if (s.phase === 'holeOver') s = sixGolfRules.reduce(s, { type: 'next' });
      else if (s.turn === HUMAN) s = sixGolfRules.reduce(s, cpuMove(s, HUMAN));
      else s = sixGolfRules.reduce(s, sixGolfRules.auto!(s)!.action);
    }
    expect(sixGolfRules.status(s)).not.toBe('playing');
    expect(s.hole).toBe(5);
  });
});
