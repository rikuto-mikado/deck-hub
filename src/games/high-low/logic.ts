import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

export interface HighLowState {
  deck: StandardCard[];
  /** Revealed cards; the last one is the current card. */
  shown: StandardCard[];
  streak: number;
  outcome: 'right' | 'push' | 'wrong' | null;
}

export type Guess = 'higher' | 'lower';
export type HighLowAction = { type: 'guess'; guess: Guess };

export function setup(rng: Rng): HighLowState {
  const deck = shuffle(createStandardDeck(), rng);
  return { deck: deck.slice(0, -1), shown: [{ ...deck.at(-1)!, faceUp: true }], streak: 0, outcome: null };
}

/** Chance the next card is strictly higher / lower, from the cards not yet seen (Ace low). */
export function odds(s: HighLowState): Record<Guess, number> {
  const cur = s.shown.at(-1)!.rank;
  const n = s.deck.length || 1;
  return {
    higher: s.deck.filter((c) => c.rank > cur).length / n,
    lower: s.deck.filter((c) => c.rank < cur).length / n,
  };
}

function reduce(s: HighLowState, a: HighLowAction): HighLowState {
  const next = s.deck.at(-1);
  if (!next || s.outcome === 'wrong') return s;
  const cur = s.shown.at(-1)!;
  const outcome = next.rank === cur.rank ? 'push' : next.rank > cur.rank === (a.guess === 'higher') ? 'right' : 'wrong';
  return {
    deck: s.deck.slice(0, -1),
    shown: [...s.shown, { ...next, faceUp: true }],
    streak: outcome === 'right' ? s.streak + 1 : s.streak,
    outcome,
  };
}

function hint(s: HighLowState) {
  if (!s.deck.length || s.outcome === 'wrong') return null;
  const o = odds(s);
  const pick = o.higher >= o.lower ? 'Higher' : 'Lower';
  return { message: `The odds favour ${pick} (${Math.round(Math.max(o.higher, o.lower) * 100)}%).` };
}

export const highLowRules: GameRules<HighLowState, HighLowAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.outcome === 'wrong' ? 'lost' : s.deck.length === 0 ? 'won' : 'playing'),
  score: (s) => s.streak,
  summary: (s) =>
    s.deck.length === 0 && s.outcome !== 'wrong' ? `Through the whole deck! Streak ${s.streak}` : `Streak ${s.streak}`,
};
