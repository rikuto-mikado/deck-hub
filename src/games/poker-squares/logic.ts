import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { evaluateHand, type HandCategory } from '@/core/rules/pokerHands';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';

export type ScoringSystem = 'american' | 'british';

export const POINTS: Record<ScoringSystem, Record<HandCategory, number>> = {
  american: {
    'royal-flush': 100,
    'straight-flush': 75,
    'four-of-a-kind': 50,
    'full-house': 25,
    flush: 20,
    straight: 15,
    'three-of-a-kind': 10,
    'two-pair': 5,
    pair: 2,
    'high-card': 0,
  },
  // British scoring follows how rare each hand is when you place the cards yourself.
  british: {
    'royal-flush': 30,
    'straight-flush': 30,
    'four-of-a-kind': 16,
    'full-house': 10,
    flush: 5,
    straight: 12,
    'three-of-a-kind': 6,
    'two-pair': 3,
    pair: 1,
    'high-card': 0,
  },
};

/** Score needed to count the grid as a win. */
export const GOAL: Record<ScoringSystem, number> = { american: 70, british: 30 };

/** The 12 scoring lines: 5 rows, 5 columns and the 2 long diagonals (cell indexes 0…24). */
export const LINES: readonly (readonly number[])[] = [
  ...Array.from({ length: 5 }, (_row, r) => Array.from({ length: 5 }, (_cell, c) => r * 5 + c)),
  ...Array.from({ length: 5 }, (_col, c) => Array.from({ length: 5 }, (_cell, r) => r * 5 + c)),
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export interface PokerSquaresState {
  grid: (StandardCard | null)[];
  /** The next card to place is the last one. */
  deck: StandardCard[];
  scoring: ScoringSystem;
}

export type PokerSquaresAction = { type: 'place'; cell: number };

export function setup(rng: Rng, options: RuleOptions = {}): PokerSquaresState {
  const deck = shuffle(createStandardDeck(), rng).slice(0, 25);
  return {
    grid: Array<StandardCard | null>(25).fill(null),
    deck: deck.map((c, i) => (i === deck.length - 1 ? { ...c, faceUp: true } : c)),
    scoring: options.scoring === 'british' ? 'british' : 'american',
  };
}

export const current = (s: PokerSquaresState) => s.deck.at(-1) ?? null;

function reduce(s: PokerSquaresState, a: PokerSquaresAction): PokerSquaresState {
  const card = current(s);
  if (!card || s.grid[a.cell] !== null || a.cell < 0 || a.cell >= 25) return s;
  const deck = s.deck.slice(0, -1);
  const last = deck.at(-1);
  if (last) deck[deck.length - 1] = { ...last, faceUp: true };
  return { ...s, grid: s.grid.map((c, i) => (i === a.cell ? card : c)), deck };
}

/** Score of a full line, or null while it is still filling. */
export function lineScore(s: PokerSquaresState, line: readonly number[]): { points: number; category: HandCategory } | null {
  const cards = line.map((i) => s.grid[i]);
  if (cards.some((c) => !c)) return null;
  const { category } = evaluateHand(cards as StandardCard[]);
  return { points: POINTS[s.scoring][category], category };
}

export const totalScore = (s: PokerSquaresState) => LINES.reduce((n, l) => n + (lineScore(s, l)?.points ?? 0), 0);

/**
 * Greedy placement advice: favour lines where the card pairs up by rank, or keeps a flush or
 * straight alive, and avoid spoiling lines that are already promising.
 */
function cellValue(s: PokerSquaresState, cell: number, card: StandardCard): number {
  let v = 0;
  for (const line of LINES) {
    if (!line.includes(cell)) continue;
    const cards = line.map((i) => s.grid[i]).filter((c): c is StandardCard => !!c);
    if (!cards.length) {
      v += 0.5;
      continue;
    }
    const sameRank = cards.filter((c) => c.rank === card.rank).length;
    const sameSuit = cards.every((c) => c.suit === card.suit);
    const ranks = [...cards.map((c) => c.rank), card.rank];
    const span = Math.max(...ranks) - Math.min(...ranks);
    const distinct = new Set(ranks).size === ranks.length;
    v += sameRank * 6;
    if (sameSuit) v += 2 + cards.length;
    if (distinct && span <= 4) v += 1.5 + cards.length * 0.5;
    if (!sameRank && !sameSuit && !(distinct && span <= 4)) v -= cards.length;
  }
  return v;
}

function hint(s: PokerSquaresState): Hint | null {
  const card = current(s);
  if (!card) return null;
  let best = -1,
    bestV = -Infinity;
  s.grid.forEach((c, i) => {
    if (c) return;
    const v = cellValue(s, i, card);
    if (v > bestV) [best, bestV] = [i, v];
  });
  const row = Math.floor(best / 5) + 1,
    col = (best % 5) + 1;
  return { cards: [card.id], message: `Try row ${row}, column ${col}.` };
}

export const pokerSquaresRules: GameRules<PokerSquaresState, PokerSquaresAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (current(s) ? 'playing' : totalScore(s) >= GOAL[s.scoring] ? 'won' : 'lost'),
  score: totalScore,
  summary: (s) =>
    `Final score ${totalScore(s)} (goal ${GOAL[s.scoring]}, ${s.scoring === 'american' ? 'American' : 'British'} scoring).`,
};
