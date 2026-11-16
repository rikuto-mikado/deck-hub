import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { canAvoid, scoundrelRules, setup, weaponUsable, type ScoundrelState } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

const base = (
  room: ReturnType<typeof c>[],
  dungeon = [c('clubs', 2), c('clubs', 3), c('clubs', 4), c('clubs', 5)],
): ScoundrelState => ({
  ...setup(createRng(1)),
  room,
  dungeon,
});

describe('scoundrel', () => {
  it('builds a 44-card dungeon with a room of 4', () => {
    const s = setup(createRng(1));
    expect(s.dungeon.length + s.room.length).toBe(44);
    expect(s.room).toHaveLength(4);
  });

  it('weapons reduce damage and degrade', () => {
    let s = base([c('diamonds', 5), c('spades', 8), c('clubs', 10), c('hearts', 4)]);
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id });
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id }); // 8 - 5 = 3
    expect(s.health).toBe(17);
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id }); // 10 > 8 → barehanded
    expect(s.health).toBe(7);
    // room refilled to 4 (1 left + 3 drawn)
    expect(s.room).toHaveLength(4);
  });

  it('allows one potion per room and no double avoid', () => {
    let s = base([c('hearts', 5), c('hearts', 6), c('clubs', 2), c('clubs', 3)]);
    s = { ...s, health: 5 };
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id });
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id });
    expect(s.health).toBe(10);
    let t = base(
      [c('clubs', 2), c('clubs', 3), c('clubs', 4), c('clubs', 5)],
      Array.from({ length: 8 }, (_, i) => c('spades', i + 2)),
    );
    expect(canAvoid(t)).toBe(true);
    t = scoundrelRules.reduce(t, { type: 'avoid' });
    expect(t.room).toHaveLength(4);
    expect(canAvoid(t)).toBe(false);
  });

  it('dies and scores negative', () => {
    let s = base([c('spades', 1), c('clubs', 13), c('clubs', 2), c('clubs', 3)]);
    s = { ...s, health: 3, weapon: null };
    s = scoundrelRules.reduce(s, { type: 'take', id: s.room[0]!.id });
    expect(scoundrelRules.status(s)).toBe('lost');
    expect(scoundrelRules.score!(s)).toBeLessThan(0);
  });
});

describe('scoundrel weapon option', () => {
  it('strictly-lower rule refuses an equal monster', () => {
    const strict = setup(createRng(1), { weapon: 'lower' });
    const s = { ...strict, weapon: c('diamonds', 5), slain: [c('spades', 8)] };
    expect(weaponUsable(s, c('clubs', 8))).toBe(false);
    expect(weaponUsable({ ...s, weaponAllowsEqual: true }, c('clubs', 8))).toBe(true);
  });
});
