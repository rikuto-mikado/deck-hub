import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { isSuitedRun } from '@/core/rules/cards';
import type { StandardCard, Suit } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

export const SUITS_FOR: Record<string, readonly Suit[]> = {
  '1': ['spades'],
  '2': ['spades', 'hearts'],
  '4': ['spades', 'hearts', 'diamonds', 'clubs'],
};

export interface SpiderState {
  tableau: StandardCard[][];
  stock: StandardCard[];
  /** Completed K→A runs. */
  done: StandardCard[][];
  moves: number;
}

export type SpiderAction = { type: 'move'; from: number; index: number; to: number } | { type: 'deal' };

export function setup(rng: Rng, options: RuleOptions = {}): SpiderState {
  const suits = SUITS_FOR[options.suits ?? '2'] ?? SUITS_FOR['2']!;
  const deck = shuffle(createStandardDeck({ decks: 2, suits }), rng);
  let k = 0;
  const tableau = Array.from({ length: 10 }, (_, i) => {
    const n = i < 4 ? 6 : 5;
    return Array.from({ length: n }, (_slot, j) => ({ ...deck[k++]!, faceUp: j === n - 1 }));
  });
  return { tableau, stock: deck.slice(k), done: [], moves: 0 };
}

export function canMove(s: SpiderState, from: number, index: number, to: number): boolean {
  if (from === to) return false;
  const src = s.tableau[from],
    dst = s.tableau[to];
  if (!src || !dst || index < 0 || index >= src.length) return false;
  const moving = src.slice(index);
  if (!isSuitedRun(moving)) return false;
  const top = dst.at(-1);
  return !top || top.rank === moving[0]!.rank + 1;
}

export function bestTarget(s: SpiderState, from: number, index: number): number | null {
  const head = s.tableau[from]?.[index];
  if (!head) return null;
  const legal = s.tableau.map((_, i) => i).filter((i) => canMove(s, from, index, i));
  const sameSuit = legal.find((i) => s.tableau[i]!.at(-1)?.suit === head.suit);
  return sameSuit ?? legal.find((i) => s.tableau[i]!.length) ?? legal[0] ?? null;
}

/** Flip exposed cards and lift out any finished K→A run. */
function settle(tableau: StandardCard[][], done: StandardCard[][]) {
  const outDone = done.slice();
  const out = tableau.map((t) => {
    let col = t;
    if (col.length >= 13) {
      const tail = col.slice(-13);
      if (tail[0]!.rank === 13 && isSuitedRun(tail)) {
        outDone.push(tail);
        col = col.slice(0, -13);
      }
    }
    const last = col.at(-1);
    return last && !last.faceUp ? [...col.slice(0, -1), { ...last, faceUp: true }] : col;
  });
  return { tableau: out, done: outDone };
}

function reduce(s: SpiderState, a: SpiderAction): SpiderState {
  if (a.type === 'deal') {
    if (!s.stock.length || s.tableau.some((t) => !t.length)) return s;
    const deal = s.stock.slice(-10);
    const tableau = s.tableau.map((t, i) => [...t, { ...deal[i]!, faceUp: true }]);
    return { ...s, ...settle(tableau, s.done), stock: s.stock.slice(0, -10), moves: s.moves + 1 };
  }
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const moving = s.tableau[a.from]!.slice(a.index);
  const tableau = s.tableau.map((t, i) => (i === a.from ? t.slice(0, a.index) : i === a.to ? [...t, ...moving] : t));
  return { ...s, ...settle(tableau, s.done), moves: s.moves + 1 };
}

/** Best next move: build in suit, turn cards over, then any build; otherwise deal. */
function hint(s: SpiderState) {
  let best: { from: number; index: number; to: number; value: number } | null = null;
  s.tableau.forEach((col, from) =>
    col.forEach((card, index) => {
      if (!card.faceUp || !isSuitedRun(col.slice(index))) return;
      s.tableau.forEach((dst, to) => {
        if (!canMove(s, from, index, to)) return;
        const top = dst.at(-1);
        const below = col[index - 1];
        let value = 0;
        if (top && top.suit === card.suit) value = 80;
        else if (below && !below.faceUp) value = 60;
        else if (top && below && below.suit !== card.suit)
          value = 40; // frees a mixed-suit stack
        else if (!top && index > 0) value = 20;
        if (value > (best?.value ?? 0)) best = { from, index, to, value };
      });
    }),
  );
  if (best) {
    const b = best as { from: number; index: number; to: number };
    const card = s.tableau[b.from]![b.index]!;
    const target = s.tableau[b.to]!.at(-1);
    return { cards: target ? [card.id, target.id] : [card.id] };
  }
  if (!s.stock.length) return null;
  return s.tableau.every((t) => t.length)
    ? { cards: [s.stock.at(-1)!.id], message: 'Deal a new row.' }
    : { message: 'Fill the empty column, then deal.' };
}

export const spiderRules: GameRules<SpiderState, SpiderAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.done.length === 8 ? 'won' : 'playing'),
  score: (s) => Math.max(0, 500 + s.done.length * 100 - s.moves),
  summary: (s) => `Solved in ${s.moves} moves`,
};
