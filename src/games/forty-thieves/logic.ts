import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { faceUp, fitsFoundation, isSuitedRun } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';

/** 'waste' | 'f0'…'f7' | 't0'…'t9' */
export type PileId = string;

export interface FortyThievesState {
  stock: StandardCard[];
  waste: StandardCard[];
  foundations: StandardCard[][];
  tableau: StandardCard[][];
  /** Josephine: same-suit runs move as a unit. Classic Forty Thieves moves one card at a time. */
  josephine: boolean;
  moves: number;
}

export type FortyThievesAction = { type: 'draw' } | { type: 'move'; from: PileId; index: number; to: PileId };

export function setup(rng: Rng, options: RuleOptions = {}): FortyThievesState {
  const deck = shuffle(createStandardDeck({ decks: 2 }), rng);
  const tableau = Array.from({ length: 10 }, (_, i) => faceUp(deck.slice(i * 4, i * 4 + 4)));
  return {
    stock: deck.slice(40),
    waste: [],
    foundations: Array.from({ length: 8 }, () => []),
    tableau,
    josephine: options.variant === 'josephine',
    moves: 0,
  };
}

export function getPile(s: FortyThievesState, id: PileId): StandardCard[] {
  if (id === 'waste') return s.waste;
  const n = Number(id.slice(1));
  return (id[0] === 'f' ? s.foundations[n] : s.tableau[n]) ?? [];
}

export function canMove(s: FortyThievesState, from: PileId, index: number, to: PileId): boolean {
  if (from === to || to === 'waste' || from[0] === 'f') return false;
  const src = getPile(s, from);
  if (index < 0 || index >= src.length) return false;
  const moving = src.slice(index);
  if (moving.length > 1 && (!s.josephine || from === 'waste' || !isSuitedRun(moving))) return false;
  const head = moving[0]!;
  if (to[0] === 'f') return moving.length === 1 && fitsFoundation(head, getPile(s, to));
  const top = getPile(s, to).at(-1);
  return !top || (top.suit === head.suit && top.rank === head.rank + 1);
}

const targets = (s: FortyThievesState) => [...s.foundations.map((_, i) => `f${i}`), ...s.tableau.map((_, i) => `t${i}`)];

export function bestTarget(s: FortyThievesState, from: PileId, index: number): PileId | null {
  const legal = targets(s).filter((t) => canMove(s, from, index, t));
  return legal.find((t) => t[0] === 'f') ?? legal.find((t) => getPile(s, t).length) ?? legal[0] ?? null;
}

function withPile(s: FortyThievesState, id: PileId, cards: StandardCard[]): FortyThievesState {
  if (id === 'waste') return { ...s, waste: cards };
  const n = Number(id.slice(1));
  if (id[0] === 'f') return { ...s, foundations: s.foundations.map((p, i) => (i === n ? cards : p)) };
  return { ...s, tableau: s.tableau.map((p, i) => (i === n ? cards : p)) };
}

function reduce(s: FortyThievesState, a: FortyThievesAction): FortyThievesState {
  if (a.type === 'draw') {
    const card = s.stock.at(-1);
    if (!card) return s;
    return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, { ...card, faceUp: true }], moves: s.moves + 1 };
  }
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const src = getPile(s, a.from);
  let next = withPile(s, a.from, src.slice(0, a.index));
  next = withPile(next, a.to, [...getPile(next, a.to), ...src.slice(a.index)]);
  return { ...next, moves: s.moves + 1 };
}

const home = (s: FortyThievesState) => s.foundations.reduce((n, f) => n + f.length, 0);

function moves(s: FortyThievesState) {
  const out: { from: PileId; index: number; to: PileId; value: number }[] = [];
  const sources: [PileId, number][] = s.waste.length ? [['waste', s.waste.length - 1]] : [];
  s.tableau.forEach((t, i) => t.forEach((_, j) => (j === t.length - 1 || s.josephine) && sources.push([`t${i}`, j])));
  for (const [from, index] of sources)
    for (const to of targets(s)) {
      if (!canMove(s, from, index, to)) continue;
      const toLen = getPile(s, to).length;
      const value =
        to[0] === 'f' ? 100 : from === 'waste' ? (toLen ? 60 : 15) : toLen ? (index === 0 ? 50 : 30) : index > 0 ? 10 : 0;
      out.push({ from, index, to, value });
    }
  return out.toSorted((a, b) => b.value - a.value);
}

function hint(s: FortyThievesState): Hint | null {
  const m = moves(s).find((x) => x.value > 0);
  if (m) {
    const card = getPile(s, m.from)[m.index]!;
    const t = getPile(s, m.to).at(-1);
    return { cards: t ? [card.id, t.id] : [card.id] };
  }
  return s.stock.length ? { message: 'Turn the next stock card.' } : null;
}

export const fortyThievesRules: GameRules<FortyThievesState, FortyThievesAction> = {
  setup,
  reduce,
  hint,
  stuck: (s) => home(s) < 104 && !s.stock.length && !moves(s).some((m) => m.value > 0),
  status: (s) => (home(s) === 104 ? 'won' : 'playing'),
  score: home,
  summary: (s) => (home(s) === 104 ? `Solved in ${s.moves} moves!` : `${home(s)} of 104 cards home.`),
};
