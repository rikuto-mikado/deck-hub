import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export const SIZE = 5;

export interface MonteCarloState {
  grid: (StandardCard | null)[];
  stock: StandardCard[];
  removed: StandardCard[];
  selected: CardId | null;
}

export type MonteCarloAction = { type: 'select'; cell: number } | { type: 'consolidate' };

export function setup(rng: Rng): MonteCarloState {
  const deck = shuffle(createStandardDeck(), rng);
  return { grid: deck.slice(0, 25).map((c) => ({ ...c, faceUp: true })), stock: deck.slice(25), removed: [], selected: null };
}

export function adjacent(a: number, b: number): boolean {
  const dr = Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)),
    dc = Math.abs((a % SIZE) - (b % SIZE));
  return a !== b && dr <= 1 && dc <= 1;
}

export function pairs(s: MonteCarloState): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 0; a < 25; a++)
    for (let b = a + 1; b < 25; b++) {
      const x = s.grid[a],
        y = s.grid[b];
      if (x && y && x.rank === y.rank && adjacent(a, b)) out.push([a, b]);
    }
  return out;
}

/** True when closing the gaps would change anything: a gap sits before a card or the stock can refill. */
export function canConsolidate(s: MonteCarloState): boolean {
  const firstGap = s.grid.indexOf(null);
  if (firstGap < 0) return false;
  return s.grid.slice(firstGap).some(Boolean) || s.stock.length > 0;
}

function reduce(s: MonteCarloState, a: MonteCarloAction): MonteCarloState {
  if (a.type === 'consolidate') {
    if (!canConsolidate(s)) return s;
    const kept = s.grid.filter((c): c is StandardCard => !!c);
    const n = Math.min(25 - kept.length, s.stock.length);
    const dealt = s.stock
      .slice(-n)
      .toReversed()
      .map((c) => ({ ...c, faceUp: true }));
    const cards = [...kept, ...dealt];
    return {
      ...s,
      grid: Array.from({ length: 25 }, (_, i) => cards[i] ?? null),
      stock: s.stock.slice(0, s.stock.length - n),
      selected: null,
    };
  }
  const card = s.grid[a.cell];
  if (!card) return s;
  if (!s.selected || s.selected === card.id) return { ...s, selected: s.selected === card.id ? null : card.id };
  const other = s.grid.findIndex((c) => c?.id === s.selected);
  if (other < 0 || s.grid[other]!.rank !== card.rank || !adjacent(other, a.cell)) return { ...s, selected: card.id };
  return {
    ...s,
    grid: s.grid.map((c, i) => (i === a.cell || i === other ? null : c)),
    removed: [...s.removed, s.grid[other]!, card],
    selected: null,
  };
}

function hint(s: MonteCarloState): Hint | null {
  const p = pairs(s)[0];
  if (p) return { cards: [s.grid[p[0]]!.id, s.grid[p[1]]!.id] };
  return canConsolidate(s) ? { message: 'Close the gaps and deal.' } : null;
}

export const monteCarloRules: GameRules<MonteCarloState, MonteCarloAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.removed.length === 52 ? 'won' : !pairs(s).length && !canConsolidate(s) ? 'lost' : 'playing'),
  score: (s) => s.removed.length,
  summary: (s) =>
    s.removed.length === 52
      ? 'All 26 pairs cleared!'
      : `${s.removed.length / 2} pairs cleared, ${52 - s.removed.length} cards left.`,
};
