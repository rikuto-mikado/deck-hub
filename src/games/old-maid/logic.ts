import { createDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { Card } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

export const PLAYERS = 4;
export const HUMAN = 0;

export interface OldMaidState {
  hands: Card[][];
  discard: Card[];
  turn: number;
  /** Players in the order they emptied their hands. */
  finished: number[];
  seed: number;
  log: string;
}

export type OldMaidAction = { type: 'draw'; by: number; index: number };

const rankKey = (c: Card) => (c.kind === 'joker' ? 'joker' : c.rank);

/** Removes pairs of equal rank, keeping one leftover per rank. */
export function discardPairs(hand: readonly Card[]): { hand: Card[]; pairs: Card[] } {
  const byRank = new Map<string | number, Card[]>();
  for (const c of hand) byRank.set(rankKey(c), [...(byRank.get(rankKey(c)) ?? []), c]);
  const keep: Card[] = [],
    pairs: Card[] = [];
  for (const [key, cards] of byRank) {
    if (key === 'joker') keep.push(...cards);
    else {
      const n = cards.length - (cards.length % 2);
      pairs.push(...cards.slice(0, n));
      keep.push(...cards.slice(n));
    }
  }
  return { hand: hand.filter((c) => keep.includes(c)), pairs };
}

const sortHand = (h: Card[]) => h.toSorted((a, b) => (a.kind === 'joker' ? 99 : a.rank) - (b.kind === 'joker' ? 99 : b.rank));

export const isActive = (s: OldMaidState, p: number) => s.hands[p]!.length > 0;

/** The player you draw from: the next player to your left who still has cards. */
export function targetOf(s: OldMaidState, p: number): number {
  for (let k = 1; k < PLAYERS; k++) {
    const q = (p + k) % PLAYERS;
    if (isActive(s, q)) return q;
  }
  return p;
}

export function setup(rng: Rng): OldMaidState {
  const deck = shuffle(createDeck({ jokers: 1 }), rng);
  const hands: Card[][] = Array.from({ length: PLAYERS }, () => []);
  deck.forEach((c, i) => hands[i % PLAYERS]!.push(c));
  const discard: Card[] = [];
  const cleaned = hands.map((h, p) => {
    const r = discardPairs(h);
    discard.push(...r.pairs);
    return p === HUMAN ? sortHand(r.hand).map((c) => ({ ...c, faceUp: true })) : r.hand;
  });
  return {
    hands: cleaned,
    discard: discard.map((c) => ({ ...c, faceUp: true })),
    turn: HUMAN,
    finished: [],
    seed: nextSeed(rng),
    log: 'Pairs are discarded. Draw from the CPU to your left.',
  };
}

function reduce(s: OldMaidState, a: OldMaidAction): OldMaidState {
  if (a.by !== s.turn || !isActive(s, a.by)) return s;
  const from = targetOf(s, a.by);
  if (from === a.by) return s;
  const card = s.hands[from]![a.index];
  if (!card) return s;
  const rng = createRng(s.seed);
  const hands = s.hands.map((h) => h.slice());
  hands[from]!.splice(a.index, 1);
  const { hand, pairs } = discardPairs([...hands[a.by]!, card]);
  hands[a.by] =
    a.by === HUMAN
      ? sortHand(hand).map((c) => ({ ...c, faceUp: true }))
      : shuffle(
          hand.map((c) => ({ ...c, faceUp: false })),
          rng,
        );
  // The victim reshuffles a hidden hand so you can't track the Joker by position.
  if (from !== HUMAN) hands[from] = shuffle(hands[from]!, rng);
  const finished = s.finished.slice();
  for (const p of [a.by, from]) if (!hands[p]!.length && !finished.includes(p)) finished.push(p);
  const next: OldMaidState = {
    ...s,
    hands,
    discard: [...s.discard, ...pairs.map((c) => ({ ...c, faceUp: true }))],
    finished,
    seed: nextSeed(rng),
    log: '',
  };
  const who = a.by === HUMAN ? 'You' : `CPU ${a.by}`;
  next.log = pairs.length ? `${who} made a pair.` : card.kind === 'joker' ? `${who} drew the Joker!` : `${who} drew a card.`;
  if (a.by === HUMAN && card.kind === 'joker') next.log = 'You drew the Joker…';
  else if (a.by !== HUMAN && from === HUMAN && card.kind === 'joker') next.log = `CPU ${a.by} took your Joker!`;
  next.turn = isActive(next, a.by) ? targetOf(next, a.by) : targetOf(next, a.by);
  return next;
}

const activeCount = (s: OldMaidState) => s.hands.filter((h) => h.length).length;

export const oldMaidRules: GameRules<OldMaidState, OldMaidAction> = {
  setup,
  reduce,
  status: (s) => {
    if (s.finished.includes(HUMAN)) return 'won';
    if (activeCount(s) <= 1) return 'lost';
    return 'playing';
  },
  auto: (s) => {
    if (s.turn === HUMAN || activeCount(s) <= 1 || s.finished.includes(HUMAN)) return null;
    const target = targetOf(s, s.turn);
    const n = s.hands[target]!.length;
    const index = createRng(s.seed ^ 0x9e3779b9).int(n);
    return { action: { type: 'draw', by: s.turn, index }, delayMs: 750 };
  },
  summary: (s) =>
    s.finished.includes(HUMAN)
      ? `You got rid of your cards (${ordinal(s.finished.indexOf(HUMAN) + 1)} out).`
      : 'You were left holding the Joker.',
};

export const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`;
