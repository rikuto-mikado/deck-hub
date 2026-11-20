import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove, pageOneRules, setup } from './logic';

describe('page one', () => {
  it('deals seven each and plays out, conserving the deck', () => {
    for (const specials of ['on', 'off']) {
      let s = setup(createRng(5), { specials });
      expect(s.hands.every((h) => h.length === 7)).toBe(true);
      for (let i = 0; i < 4000 && pageOneRules.status(s) === 'playing'; i++) {
        s = pageOneRules.reduce(s, s.turn === HUMAN ? cpuMove(s, HUMAN, 'normal') : pageOneRules.auto!(s)!.action);
        expect(s.hands.flat().length + s.stock.length + s.pile.length).toBe(52);
      }
      expect(pageOneRules.status(s)).not.toBe('playing');
    }
  });

  it('penalises a missing Page One call', () => {
    const s = setup(createRng(5), { specials: 'off' });
    const two = { ...s, hands: s.hands.map((h, p) => (p === HUMAN ? h.slice(0, 2) : h)) };
    const card = two.hands[HUMAN]!.find((c) => c.suit === two.suit || c.rank === 8 || c.rank === two.pile.at(-1)!.rank);
    if (!card) return;
    const silent = pageOneRules.reduce(two, { type: 'play', by: HUMAN, id: card.id, call: false });
    expect(silent.hands[HUMAN]).toHaveLength(3);
    const called = pageOneRules.reduce(two, { type: 'play', by: HUMAN, id: card.id, call: true });
    expect(called.hands[HUMAN]).toHaveLength(1);
  });
});
