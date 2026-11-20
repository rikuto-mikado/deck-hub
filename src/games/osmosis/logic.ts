import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export interface OsmosisState {
  reserves: StandardCard[][];
  /** Four rows, top to bottom. Row 0 takes any card of its suit; lower rows only ranks already above. */
  rows: StandardCard[][];
  stock: StandardCard[];
  waste: StandardCard[];
  /** Rank every row starts with (the first foundation card). */
  base: number;
  /** Times through the stock without a single card played: two means the game is stuck. */
  idle: number;
  played: boolean;
}

export type OsmosisAction = { type: 'draw' } | { type: 'play'; from: string; row: number };

export function setup(rng: Rng): OsmosisState {
  const deck = shuffle(createStandardDeck(), rng);
  const reserves = Array.from({ length: 4 }, (_, i) => deck.slice(i * 4, i * 4 + 4).map((c, j) => ({ ...c, faceUp: j === 3 })));
  const first = { ...deck[16]!, faceUp: true };
  return { reserves, rows: [[first], [], [], []], stock: deck.slice(17), waste: [], base: first.rank, idle: 0, played: false };
}

export function cardFrom(s: OsmosisState, from: string): StandardCard | null {
  if (from === 'waste') return s.waste.at(-1) ?? null;
  return s.reserves[Number(from.slice(1))]?.at(-1) ?? null;
}

export function fitsRow(s: OsmosisState, card: StandardCard, row: number): boolean {
  const r = s.rows[row];
  if (!r) return false;
  if (!r.length) {
    // A new row starts with the base rank in a fresh suit, once the row above it has begun.
    return card.rank === s.base && (row === 0 || s.rows[row - 1]!.length > 0) && !s.rows.some((x) => x[0]?.suit === card.suit);
  }
  if (r[0]!.suit !== card.suit) return false;
  return row === 0 || s.rows[row - 1]!.some((c) => c.rank === card.rank);
}

export const targetRow = (s: OsmosisState, card: StandardCard) => [0, 1, 2, 3].find((r) => fitsRow(s, card, r)) ?? -1;

function reduce(s: OsmosisState, a: OsmosisAction): OsmosisState {
  if (a.type === 'draw') {
    if (!s.stock.length) {
      if (!s.waste.length) return s;
      return {
        ...s,
        stock: s.waste.map((c) => ({ ...c, faceUp: false })).toReversed(),
        waste: [],
        idle: s.played ? 0 : s.idle + 1,
        played: false,
      };
    }
    const n = Math.min(3, s.stock.length);
    const drawn = s.stock
      .slice(-n)
      .toReversed()
      .map((c) => ({ ...c, faceUp: true }));
    return { ...s, stock: s.stock.slice(0, -n), waste: [...s.waste, ...drawn] };
  }
  const card = cardFrom(s, a.from);
  if (!card || !fitsRow(s, card, a.row)) return s;
  let next: OsmosisState = { ...s, rows: s.rows.map((r, i) => (i === a.row ? [...r, card] : r)), played: true, idle: 0 };
  if (a.from === 'waste') next = { ...next, waste: s.waste.slice(0, -1) };
  else {
    const n = Number(a.from.slice(1));
    next = {
      ...next,
      reserves: s.reserves.map((r, i) =>
        i !== n ? r : r.slice(0, -1).map((c, j, arr) => (j === arr.length - 1 ? { ...c, faceUp: true } : c)),
      ),
    };
  }
  return next;
}

const home = (s: OsmosisState) => s.rows.reduce((n, r) => n + r.length, 0);

function hint(s: OsmosisState): Hint | null {
  for (const from of ['r0', 'r1', 'r2', 'r3', 'waste']) {
    const c = cardFrom(s, from);
    if (c && targetRow(s, c) >= 0) return { cards: [c.id] };
  }
  return s.stock.length || s.waste.length ? { message: 'Turn the stock (three at a time).' } : null;
}

export const osmosisRules: GameRules<OsmosisState, OsmosisAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (home(s) === 52 ? 'won' : s.idle >= 2 ? 'lost' : 'playing'),
  stuck: (s) => s.idle >= 1 && !hint(s)?.cards,
  score: home,
  summary: (s) => (home(s) === 52 ? 'Every card seeped through!' : `${home(s)} of 52 cards on the foundations.`),
};
