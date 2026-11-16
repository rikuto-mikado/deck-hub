import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { faceUp } from '@/core/rules/cards';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

export const ROWS = 7;

export interface PyramidState {
  /** Row-major: row r occupies indices r(r+1)/2 … r(r+1)/2 + r. null = removed. */
  pyramid: (StandardCard | null)[];
  stock: StandardCard[];
  waste: StandardCard[];
  removed: StandardCard[];
  pass: number;
  /** Passes through the stock allowed; 0 = unlimited. */
  maxPasses: number;
}

export type PyramidAction = { type: 'remove'; ids: CardId[] } | { type: 'draw' } | { type: 'recycle' };

export const indexOf = (row: number, col: number) => (row * (row + 1)) / 2 + col;

export function rowCol(index: number): [number, number] {
  let r = 0;
  while (indexOf(r + 1, 0) <= index) r++;
  return [r, index - indexOf(r, 0)];
}

export function isExposed(s: PyramidState, index: number): boolean {
  const [r, c] = rowCol(index);
  if (!s.pyramid[index]) return false;
  if (r === ROWS - 1) return true;
  return !s.pyramid[indexOf(r + 1, c)] && !s.pyramid[indexOf(r + 1, c + 1)];
}

/** Cards that can currently be removed: exposed pyramid cards and the waste top. */
export function available(s: PyramidState): StandardCard[] {
  const out = s.pyramid.filter((card, i): card is StandardCard => !!card && isExposed(s, i));
  const top = s.waste.at(-1);
  if (top) out.push(top);
  return out;
}

export function setup(rng: Rng, options: RuleOptions = {}): PyramidState {
  const deck = faceUp(shuffle(createStandardDeck(), rng));
  const maxPasses = options.passes === 'unlimited' ? 0 : Number(options.passes ?? '3') || 3;
  return {
    pyramid: deck.slice(0, 28),
    stock: deck.slice(28).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    removed: [],
    pass: 1,
    maxPasses,
  };
}

function reduce(s: PyramidState, a: PyramidAction): PyramidState {
  switch (a.type) {
    case 'remove': {
      const avail = available(s);
      const cards = a.ids.map((id) => avail.find((c) => c.id === id));
      if (cards.some((c) => !c) || new Set(a.ids).size !== a.ids.length) return s;
      const sum = cards.reduce((n, c) => n + c!.rank, 0);
      if (sum !== 13 || cards.length > 2) return s;
      const ids = new Set<string>(a.ids);
      return {
        ...s,
        pyramid: s.pyramid.map((c) => (c && ids.has(c.id) ? null : c)),
        waste: s.waste.filter((c) => !ids.has(c.id)),
        removed: [...s.removed, ...(cards as StandardCard[])],
      };
    }
    case 'draw': {
      const card = s.stock.at(-1);
      if (!card) return s;
      return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, { ...card, faceUp: true }] };
    }
    case 'recycle': {
      if (s.stock.length || !s.waste.length || (s.maxPasses && s.pass >= s.maxPasses)) return s;
      return { ...s, stock: s.waste.map((c) => ({ ...c, faceUp: false })).toReversed(), waste: [], pass: s.pass + 1 };
    }
  }
}

function hasMove(s: PyramidState): boolean {
  const avail = available(s);
  if (avail.some((c) => c.rank === 13)) return true;
  for (let i = 0; i < avail.length; i++)
    for (let j = i + 1; j < avail.length; j++) if (avail[i]!.rank + avail[j]!.rank === 13) return true;
  return false;
}

const left = (s: PyramidState) => s.pyramid.filter(Boolean).length;

function hint(s: PyramidState) {
  const avail = available(s);
  const king = avail.find((c) => c.rank === 13);
  if (king) return { cards: [king.id] };
  for (let i = 0; i < avail.length; i++)
    for (let j = i + 1; j < avail.length; j++)
      if (avail[i]!.rank + avail[j]!.rank === 13) return { cards: [avail[i]!.id, avail[j]!.id] };
  const top = s.stock.at(-1);
  if (top) return { cards: [top.id], message: 'No pair yet — turn the stock.' };
  return s.waste.length && (!s.maxPasses || s.pass < s.maxPasses)
    ? { message: 'Tap the empty stock to go through the waste again.' }
    : null;
}

export const pyramidRules: GameRules<PyramidState, PyramidAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (left(s) === 0) return 'won';
    const canCycle = s.stock.length > 0 || (s.waste.length > 0 && (!s.maxPasses || s.pass < s.maxPasses));
    return canCycle || hasMove(s) ? 'playing' : 'lost';
  },
  score: left,
  summary: (s) => (left(s) === 0 ? 'The pyramid is gone!' : `${left(s)} pyramid cards left`),
};

/** Redeals remaining, or Infinity when unlimited. */
export const passesLeft = (s: PyramidState) => (s.maxPasses ? s.maxPasses - s.pass : Infinity);
