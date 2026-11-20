import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { rankLabel, type Rank, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

const STARTERS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

export interface CalculationState {
  /** Foundation i builds by steps of i + 1, starting from rank i + 1. */
  foundations: StandardCard[][];
  wastes: StandardCard[][];
  stock: StandardCard[];
  /** The turned card waiting to be placed. */
  current: StandardCard | null;
}

export type CalculationAction = { type: 'turn' } | { type: 'place'; to: string } | { type: 'move'; from: number; to: number };

export function setup(rng: Rng): CalculationState {
  // One A, 2, 3 and 4 (any suits) start the foundations.
  const deck = createStandardDeck();
  const starters = [1, 2, 3, 4].map((r, i) => deck.find((c) => c.rank === r && c.suit === STARTERS[i])!);
  const rest = shuffle(
    deck.filter((c) => !starters.includes(c)),
    rng,
  );
  return {
    foundations: starters.map((c) => [{ ...c, faceUp: true }]),
    wastes: [[], [], [], []],
    stock: rest,
    current: null,
  };
}

/** Rank needed next on foundation `i` (null once it reaches King). */
export function needed(s: CalculationState, i: number): number | null {
  const top = s.foundations[i]!.at(-1)!;
  if (top.rank === 13) return null;
  return ((top.rank - 1 + i + 1) % 13) + 1;
}

export const fits = (s: CalculationState, card: StandardCard, i: number) => needed(s, i) === card.rank;

function reduce(s: CalculationState, a: CalculationAction): CalculationState {
  switch (a.type) {
    case 'turn': {
      const card = s.stock.at(-1);
      if (s.current || !card) return s;
      return { ...s, stock: s.stock.slice(0, -1), current: { ...card, faceUp: true } };
    }
    case 'place': {
      const card = s.current;
      if (!card) return s;
      const n = Number(a.to.slice(1));
      if (a.to[0] === 'f') {
        if (!fits(s, card, n)) return s;
        return { ...s, current: null, foundations: s.foundations.map((f, i) => (i === n ? [...f, card] : f)) };
      }
      if (!s.wastes[n]) return s;
      return { ...s, current: null, wastes: s.wastes.map((w, i) => (i === n ? [...w, card] : w)) };
    }
    case 'move': {
      const card = s.wastes[a.from]?.at(-1);
      if (!card || !fits(s, card, a.to)) return s;
      return {
        ...s,
        wastes: s.wastes.map((w, i) => (i === a.from ? w.slice(0, -1) : w)),
        foundations: s.foundations.map((f, i) => (i === a.to ? [...f, card] : f)),
      };
    }
  }
}

const home = (s: CalculationState) => s.foundations.reduce((n, f) => n + f.length, 0);

/** Next ranks each foundation wants, written out for the player (e.g. "+2: needs 6"). */
export const needLabel = (s: CalculationState, i: number) => {
  const n = needed(s, i);
  return n ? rankLabel(n as Rank) : 'done';
};

function hint(s: CalculationState): Hint | null {
  for (let w = 0; w < 4; w++) {
    const c = s.wastes[w]!.at(-1);
    if (!c) continue;
    for (let f = 0; f < 4; f++) if (fits(s, c, f)) return { cards: [c.id, s.foundations[f]!.at(-1)!.id] };
  }
  if (!s.current) return s.stock.length ? { message: 'Turn the next card.' } : null;
  for (let f = 0; f < 4; f++) if (fits(s, s.current, f)) return { cards: [s.current.id, s.foundations[f]!.at(-1)!.id] };
  // Park it on a waste pile whose top card is needed soon after this one, else an empty pile, else Kings' pile.
  const k = s.current.rank === 13 ? 3 : s.wastes.findIndex((w) => !w.length);
  return { cards: [s.current.id], message: `No foundation wants it — park it on waste pile ${k >= 0 ? k + 1 : 1}.` };
}

export const calculationRules: GameRules<CalculationState, CalculationAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (home(s) === 52) return 'won';
    const movable = s.wastes.some((w) => w.length && [0, 1, 2, 3].some((f) => fits(s, w.at(-1)!, f)));
    return !s.current && !s.stock.length && !movable ? 'lost' : 'playing';
  },
  score: home,
  summary: (s) => (home(s) === 52 ? 'All four foundations reached their Kings!' : `${home(s)} of 52 cards built.`),
};
