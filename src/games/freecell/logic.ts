import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { faceUp, fitsFoundation, isAlternatingRun, isRed, sameColor } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

/** 'c0'…'c3' free cells, 'f0'…'f3' foundations, 't0'…'t7' cascades. */
export type PileId = string;

export interface FreeCellState {
  cells: (StandardCard | null)[];
  foundations: StandardCard[][];
  tableau: StandardCard[][];
  moves: number;
}

export type FreeCellAction = { type: 'move'; from: PileId; index: number; to: PileId };

/** Double FreeCell: two decks, ten cascades, eight free cells and eight foundations. */
export function setup(rng: Rng, options: RuleOptions = {}): FreeCellState {
  const double = options.decks === '2';
  const columns = double ? 10 : 8;
  const deck = faceUp(shuffle(createStandardDeck({ decks: double ? 2 : 1 }), rng));
  const tableau: StandardCard[][] = Array.from({ length: columns }, () => []);
  deck.forEach((c, i) => tableau[i % columns]!.push(c));
  const slots = double ? 8 : 4;
  return {
    cells: Array.from({ length: slots }, () => null),
    foundations: Array.from({ length: slots }, () => []),
    tableau,
    moves: 0,
  };
}

const totalCards = (s: FreeCellState) => s.foundations.length * 13;
const targetsOf = (s: FreeCellState) => [
  ...s.foundations.map((_, i) => `f${i}`),
  ...s.tableau.map((_, i) => `t${i}`),
  ...s.cells.map((_, i) => `c${i}`),
];

export function getPile(s: FreeCellState, id: PileId): StandardCard[] {
  const n = Number(id.slice(1));
  if (id[0] === 'c') return s.cells[n] ? [s.cells[n]!] : [];
  if (id[0] === 'f') return s.foundations[n] ?? [];
  return s.tableau[n] ?? [];
}

/** Max cards movable at once: (free cells + 1) × 2^(empty cascades, not counting the target). */
export function maxRun(s: FreeCellState, to: PileId): number {
  const freeCells = s.cells.filter((c) => !c).length;
  const emptyCols = s.tableau.filter((t, i) => !t.length && `t${i}` !== to).length;
  return (freeCells + 1) * 2 ** emptyCols;
}

export function canMove(s: FreeCellState, from: PileId, index: number, to: PileId): boolean {
  if (from === to || (from[0] === 'f' && to[0] === 'f')) return false;
  const src = getPile(s, from);
  if (index < 0 || index >= src.length) return false;
  const moving = src.slice(index);
  if (!isAlternatingRun(moving)) return false;
  const head = moving[0]!;
  if (to[0] === 'c') return moving.length === 1 && !s.cells[Number(to.slice(1))];
  if (to[0] === 'f') return moving.length === 1 && fitsFoundation(head, s.foundations[Number(to.slice(1))]!);
  if (moving.length > maxRun(s, to)) return false;
  const top = getPile(s, to).at(-1);
  return !top || (top.rank === head.rank + 1 && !sameColor(top, head));
}

export function bestTarget(s: FreeCellState, from: PileId, index: number): PileId | null {
  const legal = targetsOf(s).filter((t) => canMove(s, from, index, t));
  return (
    legal.find((t) => t[0] === 'f') ??
    legal.find((t) => t[0] === 't' && getPile(s, t).length) ??
    legal.find((t) => t[0] === 't') ??
    (from[0] === 'c' ? null : legal.find((t) => t[0] === 'c')) ??
    null
  );
}

function withPile(s: FreeCellState, id: PileId, cards: StandardCard[]): FreeCellState {
  const n = Number(id.slice(1));
  if (id[0] === 'c') return { ...s, cells: s.cells.map((c, i) => (i === n ? (cards[0] ?? null) : c)) };
  if (id[0] === 'f') return { ...s, foundations: s.foundations.map((f, i) => (i === n ? cards : f)) };
  return { ...s, tableau: s.tableau.map((t, i) => (i === n ? cards : t)) };
}

function reduce(s: FreeCellState, a: FreeCellAction): FreeCellState {
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const src = getPile(s, a.from);
  let next = withPile(s, a.from, src.slice(0, a.index));
  next = withPile(next, a.to, [...getPile(next, a.to), ...src.slice(a.index)]);
  return { ...next, moves: s.moves + 1 };
}

/** A card is safe to auto-play when no tableau card could still need it as a parent. */
function isSafe(s: FreeCellState, card: StandardCard): boolean {
  if (card.rank <= 2) return true;
  const opposite = s.foundations.filter((f) => f[0] && isRed(f[0]) !== isRed(card)).map((f) => f.length);
  return opposite.length === s.foundations.length / 2 && Math.min(...opposite) >= card.rank - 1;
}

function autoPlay(s: FreeCellState): FreeCellAction | null {
  const sources: PileId[] = [...s.cells.map((_, i) => `c${i}`), ...s.tableau.map((_, i) => `t${i}`)];
  for (const from of sources) {
    const pile = getPile(s, from);
    const card = pile.at(-1);
    if (!card || !isSafe(s, card)) continue;
    for (let f = 0; f < s.foundations.length; f++)
      if (canMove(s, from, pile.length - 1, `f${f}`)) return { type: 'move', from, index: pile.length - 1, to: `f${f}` };
  }
  return null;
}

const onFoundations = (s: FreeCellState) => s.foundations.reduce((n, f) => n + f.length, 0);

/** Best next move: home first, then building on columns, then using space. */
function hint(s: FreeCellState) {
  const sources: [PileId, number][] = [];
  s.cells.forEach((c, i) => c && sources.push([`c${i}`, 0]));
  s.tableau.forEach((t, i) => t.forEach((_, j) => isAlternatingRun(t.slice(j)) && sources.push([`t${i}`, j])));
  let best: { from: PileId; index: number; to: PileId; value: number } | null = null;
  for (const [from, index] of sources) {
    for (const to of targetsOf(s)) {
      if (!canMove(s, from, index, to)) continue;
      const toLen = getPile(s, to).length;
      let value: number;
      if (to[0] === 'f') value = 100;
      else if (to[0] === 't' && toLen) value = from[0] === 'c' ? 70 : index > 0 ? 60 : 40;
      else if (to[0] === 't')
        value = index > 0 || from[0] === 'c' ? 20 : 0; // whole column into an empty one is pointless
      else value = from[0] === 'c' ? 0 : 10;
      if (value > (best?.value ?? 0)) best = { from, index, to, value };
    }
  }
  if (!best) return null;
  const card = getPile(s, best.from)[best.index]!;
  const target = getPile(s, best.to).at(-1);
  return { cards: target ? [card.id, target.id] : [card.id] };
}

export const freeCellRules: GameRules<FreeCellState, FreeCellAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (onFoundations(s) === totalCards(s) ? 'won' : 'playing'),
  auto: (s) => {
    const action = autoPlay(s);
    return action ? { action, delayMs: 140 } : null;
  },
  score: onFoundations,
  summary: (s) => `Solved in ${s.moves} moves`,
};
