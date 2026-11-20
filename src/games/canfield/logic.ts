import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { sameColor } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';

/** 'reserve' | 'waste' | 'f0'…'f3' | 't0'…'t3' */
export type PileId = string;

export interface CanfieldState {
  reserve: StandardCard[];
  stock: StandardCard[];
  waste: StandardCard[];
  foundations: StandardCard[][];
  tableau: StandardCard[][];
  /** Rank every foundation starts from, set by the first card dealt to them. */
  base: number;
  draw: number;
  moves: number;
}

export type CanfieldAction = { type: 'draw' } | { type: 'move'; from: PileId; index: number; to: PileId };

/** One rank up, wrapping K → A. */
const up = (r: number) => (r % 13) + 1;

export function setup(rng: Rng, options: RuleOptions = {}): CanfieldState {
  const deck = shuffle(createStandardDeck(), rng).map((c) => ({ ...c, faceUp: true }));
  const reserve = deck.slice(0, 13).map((c, i) => ({ ...c, faceUp: i === 12 }));
  const first = deck[13]!;
  const foundations: StandardCard[][] = [[first], [], [], []];
  const tableau = deck.slice(14, 18).map((c) => [c]);
  return {
    reserve,
    stock: deck.slice(18).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations,
    tableau,
    base: first.rank,
    draw: options.draw === '1' ? 1 : 3,
    moves: 0,
  };
}

export function getPile(s: CanfieldState, id: PileId): StandardCard[] {
  if (id === 'reserve') return s.reserve;
  if (id === 'waste') return s.waste;
  const n = Number(id.slice(1));
  return (id[0] === 'f' ? s.foundations[n] : s.tableau[n]) ?? [];
}

export function fitsHome(s: CanfieldState, card: StandardCard, f: readonly StandardCard[]): boolean {
  const top = f.at(-1);
  return top ? top.suit === card.suit && card.rank === up(top.rank) : card.rank === s.base;
}

/** Tableau runs: down in alternating colours, wrapping A → K. */
const fitsOn = (top: StandardCard, card: StandardCard) => !sameColor(top, card) && up(card.rank) === top.rank;

export function isRun(cards: readonly StandardCard[]): boolean {
  for (let i = 1; i < cards.length; i++) if (!fitsOn(cards[i - 1]!, cards[i]!)) return false;
  return true;
}

export function canMove(s: CanfieldState, from: PileId, index: number, to: PileId): boolean {
  if (from === to || to === 'reserve' || to === 'waste' || from[0] === 'f') return false;
  const src = getPile(s, from);
  if (index < 0 || index >= src.length) return false;
  const moving = src.slice(index);
  // Only top cards leave the reserve and waste; a column moves either its top card or the whole column.
  if (from[0] !== 't' && moving.length !== 1) return false;
  if (from[0] === 't' && moving.length > 1 && index !== 0) return false;
  if (!isRun(moving)) return false;
  const head = moving[0]!;
  if (to[0] === 'f') return moving.length === 1 && fitsHome(s, head, getPile(s, to));
  const top = getPile(s, to).at(-1);
  // Empty columns refill from the reserve automatically; once it is gone, any card may fill one.
  return top ? fitsOn(top, head) : s.reserve.length === 0;
}

const TARGETS = ['f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3'];

export function bestTarget(s: CanfieldState, from: PileId, index: number): PileId | null {
  const legal = TARGETS.filter((t) => canMove(s, from, index, t));
  return legal.find((t) => t[0] === 'f') ?? legal.find((t) => getPile(s, t).length) ?? legal[0] ?? null;
}

function withPile(s: CanfieldState, id: PileId, cards: StandardCard[]): CanfieldState {
  if (id === 'reserve') return { ...s, reserve: cards.map((c, i) => (i === cards.length - 1 ? { ...c, faceUp: true } : c)) };
  if (id === 'waste') return { ...s, waste: cards };
  const n = Number(id.slice(1));
  if (id[0] === 'f') return { ...s, foundations: s.foundations.map((p, i) => (i === n ? cards : p)) };
  return { ...s, tableau: s.tableau.map((p, i) => (i === n ? cards : p)) };
}

/** An emptied column is refilled at once from the reserve. */
function refill(s: CanfieldState): CanfieldState {
  let next = s;
  next.tableau.forEach((t, i) => {
    if (t.length || !next.reserve.length) return;
    const card = { ...next.reserve.at(-1)!, faceUp: true };
    next = withPile(withPile(next, 'reserve', next.reserve.slice(0, -1)), `t${i}`, [card]);
  });
  return next;
}

function reduce(s: CanfieldState, a: CanfieldAction): CanfieldState {
  if (a.type === 'draw') {
    if (!s.stock.length) {
      if (!s.waste.length) return s;
      return { ...s, stock: s.waste.map((c) => ({ ...c, faceUp: false })).toReversed(), waste: [], moves: s.moves + 1 };
    }
    const n = Math.min(s.draw, s.stock.length);
    const drawn = s.stock
      .slice(-n)
      .toReversed()
      .map((c) => ({ ...c, faceUp: true }));
    return { ...s, stock: s.stock.slice(0, -n), waste: [...s.waste, ...drawn], moves: s.moves + 1 };
  }
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const src = getPile(s, a.from);
  let next = withPile(s, a.from, src.slice(0, a.index));
  next = withPile(next, a.to, [...getPile(next, a.to), ...src.slice(a.index)]);
  return { ...refill(next), moves: s.moves + 1 };
}

const home = (s: CanfieldState) => s.foundations.reduce((n, f) => n + f.length, 0);

function hint(s: CanfieldState): Hint | null {
  const sources: [PileId, number][] = [];
  if (s.reserve.length) sources.push(['reserve', s.reserve.length - 1]);
  if (s.waste.length) sources.push(['waste', s.waste.length - 1]);
  s.tableau.forEach((t, i) => t.length && sources.push([`t${i}`, t.length - 1], [`t${i}`, 0]));
  let best: { from: PileId; index: number; to: PileId; v: number } | null = null;
  for (const [from, index] of sources)
    for (const to of TARGETS) {
      if (!canMove(s, from, index, to)) continue;
      const v = (to[0] === 'f' ? 100 : 0) + (from === 'reserve' ? 50 : from === 'waste' ? 20 : 5);
      if (from[0] === 't' && to[0] === 't' && index === 0 && !s.reserve.length) continue;
      if (!best || v > best.v) best = { from, index, to, v };
    }
  if (!best) return s.stock.length || s.waste.length ? { message: 'Turn the stock.' } : null;
  const card = getPile(s, best.from)[best.index]!;
  const t = getPile(s, best.to).at(-1);
  return { cards: t ? [card.id, t.id] : [card.id] };
}

export const canfieldRules: GameRules<CanfieldState, CanfieldAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (home(s) === 52 ? 'won' : 'playing'),
  score: home,
  summary: (s) => `${home(s)} cards home in ${s.moves} moves.`,
};
