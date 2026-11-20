import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { gridcannonRules, payloadDamage, setup, shotsFrom } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('gridcannon', () => {
  it('fills the 3×3 grid with number cards', () => {
    const s = setup(createRng(2));
    expect(s.grid.every((g) => g.length === 1 && g[0]!.kind === 'standard' && g[0]!.rank >= 2 && g[0]!.rank <= 10)).toBe(true);
  });

  it('fires through the two cards opposite the royal', () => {
    expect(
      shotsFrom(0)
        .map((x) => x.slot)
        .toSorted(),
    ).toEqual([3, 6]);
    expect(shotsFrom(4)).toEqual([]);
    const s = setup(createRng(2));
    s.grid[3] = [c('hearts', 6)];
    s.grid[6] = [c('spades', 7)];
    expect(payloadDamage(s, c('hearts', 11), [3, 6])).toBe(13);
    expect(payloadDamage(s, c('diamonds', 12), [3, 6])).toBe(6);
    expect(payloadDamage(s, c('spades', 13), [3, 6])).toBe(7);
  });

  it('plays to an ending by its own hints', () => {
    let s = setup(createRng(5));
    for (let i = 0; i < 400 && gridcannonRules.status(s) === 'playing'; i++) {
      if (!s.current) s = gridcannonRules.reduce(s, { type: 'draw' });
      else {
        const cell = s.grid.findIndex(
          (g) =>
            !g.length ||
            (g.at(-1)!.kind === 'standard' ? (g.at(-1) as { rank: number }).rank : 0) <= (s.current as { rank: number }).rank,
        );
        const next = cell >= 0 ? gridcannonRules.reduce(s, { type: 'place', cell }) : s;
        s = next === s && s.reserve.length ? gridcannonRules.reduce(s, { type: 'reserve', id: s.reserve[0]!.id, cell: 0 }) : next;
      }
    }
    expect(gridcannonRules.status(s)).not.toBe('playing');
  });
});
