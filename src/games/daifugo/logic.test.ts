import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import type { Card, CardId, Rank, Suit } from '@/core/types/card';
import {
  HUMAN,
  PLAYERS,
  cpuMove,
  daifugoRules,
  legalShape,
  setup,
  sortHand,
  type DaifugoAction,
  type DaifugoState,
} from './logic';

let copy = 0;
const c = (suit: Suit, rank: number): Card => makeCard(suit, rank as Rank, copy++, true);
const J = (n = 0): Card => ({ kind: 'joker', id: `JK-${n}` as CardId, faceUp: true });

/** A play-phase state with the given hands; player 0 to move. */
function table(hands: Card[][], extra: Partial<DaifugoState> = {}, options = {}): DaifugoState {
  const base = setup(createRng(1), options);
  return { ...base, phase: 'play', hands: hands.map((h) => sortHand(h)), turn: 0, pendingGive: null, log: '', ...extra };
}
const ids = (...cards: Card[]) => cards.map((x) => x.id);
const act = (s: DaifugoState, ...actions: DaifugoAction[]) => actions.reduce((st, a) => daifugoRules.reduce(st, a), s);
const filler = () => [c('clubs', 4), c('clubs', 5), c('clubs', 6)];

describe('daifugo: deal', () => {
  it.each([
    ['0', 52],
    ['1', 53],
    ['2', 54],
  ])('%s joker(s) → %i cards, ♦3 leads round 1', (jokers, n) => {
    const s = setup(createRng(3), { jokers });
    expect(s.hands.flat()).toHaveLength(n);
    expect(s.hands[s.turn]!.some((x) => x.kind === 'standard' && x.suit === 'diamonds' && x.rank === 3)).toBe(true);
  });
});

describe('daifugo: plays', () => {
  it('ranks 3 low, 2 high, Joker wild in groups', () => {
    const lead = table([[], [], [], []], { table: null });
    const s = { ...lead, table: { ...legalShape(lead, [c('spades', 1)])!, cards: [c('spades', 1)], by: 1 } };
    expect(legalShape(s, [c('hearts', 2)])).not.toBeNull();
    expect(legalShape(s, [c('hearts', 13)])).toBeNull();
    expect(legalShape(s, [J()])).not.toBeNull();
    expect(legalShape(lead, [c('spades', 9), J()])?.kind).toBe('group');
    expect(legalShape(lead, [c('spades', 9), c('hearts', 10)])).toBeNull();
  });

  it('stairs: same suit, 3+ in a row, Jokers fill gaps, must be beaten by a higher run of equal length', () => {
    const lead = table([[], [], [], []]);
    expect(legalShape(lead, [c('hearts', 4), c('hearts', 5), c('hearts', 6)])?.kind).toBe('stairs');
    expect(legalShape(lead, [c('hearts', 4), c('hearts', 6), J()])?.kind).toBe('stairs');
    expect(legalShape(lead, [c('hearts', 4), c('spades', 5), c('hearts', 6)])).toBeNull();
    expect(legalShape(lead, [c('hearts', 1), c('hearts', 2), c('hearts', 3)])).toBeNull(); // no wrap past 2
    const run = [c('hearts', 4), c('hearts', 5), c('hearts', 6)];
    const s = { ...lead, table: { ...legalShape(lead, run)!, cards: run, by: 1 } };
    expect(legalShape(s, [c('spades', 5), c('spades', 6), c('spades', 7)])).not.toBeNull();
    expect(legalShape(s, [c('spades', 3), c('spades', 4), c('spades', 5)])).toBeNull();
    expect(legalShape(s, [c('spades', 7), c('spades', 8), c('spades', 9), c('spades', 10)])).toBeNull();
    expect(legalShape(s, [c('spades', 7), c('hearts', 7), c('clubs', 7)])).toBeNull();
  });

  it('stairs can be turned off', () => {
    const lead = table([[], [], [], []], {}, { stairs: 'off' });
    expect(legalShape(lead, [c('hearts', 4), c('hearts', 5), c('hearts', 6)])).toBeNull();
  });
});

describe('daifugo: special rules', () => {
  it('8-cut clears the trick and the player leads again', () => {
    const eight = c('spades', 8);
    const s = act(table([[eight, ...filler()], filler(), filler(), filler()]), { type: 'play', by: 0, ids: ids(eight) });
    expect(s.table).toBeNull();
    expect(s.turn).toBe(0);
  });

  it('four of a kind starts a revolution that reverses strength', () => {
    const quad = [c('spades', 5), c('hearts', 5), c('clubs', 5), c('diamonds', 5)];
    const s = act(table([[...quad, ...filler()], filler(), filler(), filler()]), { type: 'play', by: 0, ids: ids(...quad) });
    expect(s.revolution).toBe(true);
    const open = { ...s, table: null };
    const single = { ...s, table: { ...legalShape(open, [c('spades', 9)])!, cards: [c('spades', 9)], by: 1 } };
    expect(legalShape(single, [c('hearts', 4)])).not.toBeNull();
    expect(legalShape(single, [c('hearts', 13)])).toBeNull();
  });

  it('J-back reverses strength until the trick clears', () => {
    const jack = c('spades', 11);
    let s = act(table([[jack, ...filler()], [c('hearts', 10), c('hearts', 12), ...filler()], filler(), filler()]), {
      type: 'play',
      by: 0,
      ids: ids(jack),
    });
    expect(s.jBack).toBe(true);
    expect(legalShape(s, [c('hearts', 10)])).not.toBeNull();
    expect(legalShape(s, [c('hearts', 12)])).toBeNull();
    s = act(s, { type: 'pass', by: 1 }, { type: 'pass', by: 2 }, { type: 'pass', by: 3 });
    expect(s.jBack).toBe(false);
  });

  it('two plays of the same suit lock the trick to that suit', () => {
    const h4 = c('hearts', 4),
      h6 = c('hearts', 6);
    let s = table([
      [h4, ...filler()],
      [h6, c('spades', 9), ...filler()],
      [c('spades', 10), c('hearts', 10), ...filler()],
      filler(),
    ]);
    s = act(s, { type: 'play', by: 0, ids: ids(h4) }, { type: 'play', by: 1, ids: ids(h6) });
    expect(s.lock).toEqual(['hearts']);
    expect(legalShape(s, [c('spades', 10)])).toBeNull();
    expect(legalShape(s, [c('hearts', 10)])).not.toBeNull();
  });

  it('a lone Joker can only be beaten by the Spade 3', () => {
    const joker = J();
    const s3 = c('spades', 3);
    let s = table([[joker, ...filler()], [s3, c('hearts', 2), ...filler()], filler(), filler()]);
    s = act(s, { type: 'play', by: 0, ids: ids(joker) });
    expect(legalShape(s, [c('hearts', 2)])).toBeNull();
    s = act(s, { type: 'play', by: 1, ids: ids(s3) });
    expect(s.table).toBeNull();
    expect(s.turn).toBe(1);
  });

  it('finishing on a Joker, 2 or 8 is a forbidden finish and sends you to the bottom', () => {
    const two = c('hearts', 2);
    const s = act(table([[two], filler(), filler(), filler()]), { type: 'play', by: 0, ids: ids(two) });
    expect(s.fallen).toEqual([0]);
    expect(s.finished).toEqual([]);
  });

  it('miyako-ochi drops the previous Daifugo when someone else finishes first', () => {
    const last = c('hearts', 9);
    const s = act(table([[last], filler(), filler(), filler()], { lastPlaces: [1, 0, 2, 3] }), {
      type: 'play',
      by: 0,
      ids: ids(last),
    });
    expect(s.finished).toEqual([0]);
    expect(s.fallen).toEqual([1]);
    expect(s.hands[1]).toHaveLength(0);
  });
});

describe('daifugo: exchange', () => {
  it('lower ranks give their strongest cards and the human picks cards to return', () => {
    let s = setup(createRng(5));
    // Finish round 1 with the human as Daifugo.
    s = { ...s, phase: 'roundOver', places: [0, 1, 2, 3], points: [3, 2, 1, 0] };
    const before = s.seed;
    s = daifugoRules.reduce(s, { type: 'nextRound' });
    expect(s.round).toBe(2);
    expect(s.phase).toBe('exchange');
    expect(s.pendingGive).toEqual({ from: HUMAN, to: 3, count: 2 });
    expect(s.hands[HUMAN]!.length).toBeGreaterThan(s.hands[3]!.length);
    const give = s.hands[HUMAN]!.slice(0, 2);
    s = daifugoRules.reduce(s, { type: 'give', by: HUMAN, ids: ids(...give) });
    expect(s.phase).toBe('play');
    expect(s.hands[3]!.some((x) => x.id === give[0]!.id)).toBe(true);
    expect(s.turn).toBe(3); // Daihinmin leads
    expect(before).not.toBe(s.seed);
  });
});

describe('daifugo: full matches', () => {
  it('CPU-only matches always finish with valid rankings', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let s = setup(createRng(seed), {
        rounds: '3',
        jokers: seed % 3 === 0 ? '2' : '1',
        stairRevolution: seed % 2 ? 'on' : 'off',
      });
      for (let i = 0; i < 5000 && s.phase !== 'matchOver'; i++) {
        if (s.phase === 'roundOver') s = daifugoRules.reduce(s, { type: 'nextRound' });
        else if (s.phase === 'exchange') {
          const g = s.pendingGive!;
          s = daifugoRules.reduce(s, { type: 'give', by: HUMAN, ids: s.hands[HUMAN]!.slice(0, g.count).map((x) => x.id) });
        } else s = daifugoRules.reduce(s, cpuMove(s, s.turn));
        expect(s.hands.flat().length + s.cleared.length + (s.table?.cards.length ?? 0)).toBeGreaterThan(0);
      }
      expect(s.phase).toBe('matchOver');
      expect(s.places!.toSorted()).toEqual([0, 1, 2, 3]);
      expect(s.points.reduce((a, b) => a + b, 0)).toBe(3 * (3 + 2 + 1));
      expect(daifugoRules.status(s)).not.toBe('playing');
      expect(PLAYERS).toBe(4);
    }
  });
});
