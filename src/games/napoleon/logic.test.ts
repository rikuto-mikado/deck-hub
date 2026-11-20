import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { HUMAN, chooseAdjutant, chooseDiscards, cpuBid, cpuMove, napoleonRules, setup, toAct, trumpOf, winnerOf } from './logic';

const c = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: number) => makeCard(suit, rank as never, 0, true);

describe('napoleon', () => {
  it('Mighty, Jacks and Yoromeki rank as in the standard preset', () => {
    expect(
      winnerOf(
        [
          { by: 0, card: c('hearts', 1) },
          { by: 1, card: c('spades', 1) },
        ],
        'hearts',
      ),
    ).toBe(1);
    expect(
      winnerOf(
        [
          { by: 0, card: c('spades', 1) },
          { by: 1, card: c('hearts', 12) },
        ],
        'clubs',
      ),
    ).toBe(1);
    expect(
      winnerOf(
        [
          { by: 0, card: c('diamonds', 1) },
          { by: 1, card: c('hearts', 11) },
        ],
        'diamonds',
      ),
    ).toBe(1); // 裏J
    expect(
      winnerOf(
        [
          { by: 0, card: c('clubs', 11) },
          { by: 1, card: c('spades', 11) },
        ],
        'clubs',
      ),
    ).toBe(0); // 正J beats 裏J
  });

  it('plays a full match', () => {
    let s = setup(createRng(5), { deals: '3' });
    expect(s.hands.every((h) => h.length === 12)).toBe(true);
    for (let i = 0; i < 5000 && napoleonRules.status(s) === 'playing'; i++) {
      if (s.phase === 'dealOver') s = napoleonRules.reduce(s, { type: 'next' });
      else if (s.phase === 'bid' && s.turn === HUMAN)
        s = napoleonRules.reduce(s, { type: 'bid', by: HUMAN, bid: cpuBid(s, HUMAN) });
      else if (s.phase === 'declare' && s.napoleon === HUMAN) {
        const d = chooseDiscards(s.hands[HUMAN]!, trumpOf(s));
        s = napoleonRules.reduce(s, {
          type: 'declare',
          adjutant: chooseAdjutant(s.hands[HUMAN]!, trumpOf(s)).id,
          discard: d.map((x) => x.id),
        });
      } else if (toAct(s) === HUMAN) s = napoleonRules.reduce(s, { type: 'play', by: HUMAN, id: cpuMove(s, HUMAN).id });
      else {
        const step = napoleonRules.auto!(s);
        if (!step) break;
        s = napoleonRules.reduce(s, step.action);
      }
    }
    expect(napoleonRules.status(s)).not.toBe('playing');
  });
});
