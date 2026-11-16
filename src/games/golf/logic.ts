import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { faceUp, isAdjacentRank } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import { isOn, type GameRules, type RuleOptions } from '@/core/types/game';

export interface GolfState {
  columns: StandardCard[][];
  stock: StandardCard[];
  waste: StandardCard[];
  /** K and A connect. */
  wrap: boolean;
  /** Nothing may be played on a King. */
  kingStops: boolean;
}

export type GolfAction = { type: 'play'; column: number } | { type: 'draw' };

export function setup(rng: Rng, options: RuleOptions = {}): GolfState {
  const deck = shuffle(createStandardDeck(), rng);
  const columns = Array.from({ length: 7 }, (_, i) => faceUp(deck.slice(i * 5, i * 5 + 5)));
  const rest = deck.slice(35);
  return {
    columns,
    stock: rest.slice(1),
    waste: faceUp(rest.slice(0, 1)),
    wrap: isOn(options, 'wrap'),
    kingStops: isOn(options, 'kingStops'),
  };
}

export function canPlay(s: GolfState, column: number): boolean {
  const card = s.columns[column]?.at(-1);
  const top = s.waste.at(-1);
  if (!card || !top || (s.kingStops && top.rank === 13)) return false;
  return isAdjacentRank(card, top, s.wrap);
}

function reduce(s: GolfState, a: GolfAction): GolfState {
  switch (a.type) {
    case 'play': {
      if (!canPlay(s, a.column)) return s;
      const col = s.columns[a.column]!;
      return {
        ...s,
        columns: s.columns.map((c, i) => (i === a.column ? c.slice(0, -1) : c)),
        waste: [...s.waste, col.at(-1)!],
      };
    }
    case 'draw': {
      const card = s.stock.at(-1);
      if (!card) return s;
      return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, { ...card, faceUp: true }] };
    }
  }
}

const remaining = (s: GolfState) => s.columns.reduce((n, c) => n + c.length, 0);

/** Standard Golf scoring: cards left in the columns; clearing them all scores minus the stock left. */
export const golfScore = (s: GolfState) => (remaining(s) ? remaining(s) : -s.stock.length);

function hint(s: GolfState) {
  const col = s.columns.findIndex((_, i) => canPlay(s, i));
  if (col >= 0) return { cards: [s.columns[col]!.at(-1)!.id] };
  const top = s.stock.at(-1);
  return top ? { cards: [top.id], message: 'Nothing fits — turn the stock.' } : null;
}

export const golfRules: GameRules<GolfState, GolfAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (remaining(s) === 0) return 'won';
    if (s.stock.length === 0 && !s.columns.some((_, i) => canPlay(s, i))) return 'lost';
    return 'playing';
  },
  score: golfScore,
  summary: (s) =>
    remaining(s) === 0 ? `Cleared every column! Score ${golfScore(s)}` : `Score ${golfScore(s)} (lower is better)`,
};
