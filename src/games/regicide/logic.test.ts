import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Rank, Suit } from '@/core/types/card';
import { boss, isValidAttack, regicideRules, setup } from './logic';

const c = (suit: Suit, rank: number) => makeCard(suit, rank as Rank, 0, true);

describe('regicide', () => {
  it('sets up Jacks on top, a 32-card tavern and a hand of eight', () => {
    const s = setup(createRng(3));
    expect(boss(s)!.rank).toBe(11);
    expect(s.castle.slice(0, 4).every((k) => k.rank === 13)).toBe(true);
    expect(s.hand).toHaveLength(8);
    expect(s.tavern).toHaveLength(32);
  });

  it('accepts companions and small combos only', () => {
    expect(isValidAttack([c('hearts', 1), c('spades', 9)])).toBe(true);
    expect(isValidAttack([c('hearts', 3), c('spades', 3), c('clubs', 3)])).toBe(true);
    expect(isValidAttack([c('hearts', 6), c('spades', 6)])).toBe(false);
    expect(isValidAttack([c('hearts', 2), c('spades', 3)])).toBe(false);
  });

  it('doubles club damage, respects immunity and sends an exact kill to the tavern', () => {
    const s = setup(createRng(3));
    const jack = { ...c('spades', 11), faceUp: true };
    const t = { ...s, castle: [...s.castle.slice(0, -1), jack], hand: [c('clubs', 10)], damage: 0 };
    const after = regicideRules.reduce(t, { type: 'attack', ids: [t.hand[0]!.id] });
    expect(after.castle).toHaveLength(t.castle.length - 1);
    expect(after.tavern.at(-1)!.id).toBe(jack.id);
    const immune = { ...t, castle: [...s.castle.slice(0, -1), { ...c('clubs', 11), faceUp: true }] };
    expect(regicideRules.reduce(immune, { type: 'attack', ids: [t.hand[0]!.id] }).damage).toBe(10);
  });

  it('a hinted game always progresses to an end', () => {
    let s = setup(createRng(7));
    for (let i = 0; i < 500 && regicideRules.status(s) === 'playing'; i++) {
      const h = regicideRules.hint!(s);
      const ids = (h?.cards ?? []) as never[];
      const next =
        s.phase === 'defend'
          ? ids.length
            ? regicideRules.reduce(s, { type: 'defend', ids })
            : regicideRules.reduce(s, { type: 'jester' })
          : regicideRules.reduce(s, ids.length ? { type: 'attack', ids } : { type: 'jester' });
      if (next === s) s = regicideRules.reduce(s, s.phase === 'attack' ? { type: 'yield' } : { type: 'jester' });
      else s = next;
    }
    expect(regicideRules.status(s)).not.toBe('playing');
  });
});
