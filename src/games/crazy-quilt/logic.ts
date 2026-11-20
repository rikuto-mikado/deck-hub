import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export const N = 8;

export interface CrazyQuiltState {
  /** 8×8 quilt; null where a card has been played. */
  quilt: (StandardCard | null)[];
  /** f0…f3 build up from Ace, f4…f7 build down from King (♠ ♥ ♦ ♣ order). */
  foundations: StandardCard[][];
  stock: StandardCard[];
  waste: StandardCard[];
  redeals: number;
}

export type CrazyQuiltAction = { type: 'draw' } | { type: 'move'; from: string; to: string };

/** Cards alternate like a woven rug: even cells upright, odd cells turned sideways. */
export const isUpright = (cell: number) => (Math.floor(cell / N) + (cell % N)) % 2 === 0;

export function setup(rng: Rng): CrazyQuiltState {
  const deck = createStandardDeck({ decks: 2 });
  const aces = SUITS.map((s) => deck.find((c) => c.suit === s && c.rank === 1)!);
  const kings = SUITS.map((s) => deck.find((c) => c.suit === s && c.rank === 13)!);
  const rest = shuffle(
    deck.filter((c) => !aces.includes(c) && !kings.includes(c)),
    rng,
  ).map((c) => ({ ...c, faceUp: true }));
  return {
    quilt: rest.slice(0, 64),
    foundations: [...aces, ...kings].map((c) => [{ ...c, faceUp: true }]),
    stock: rest.slice(64).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    redeals: 1,
  };
}

/** A quilt card is free when one of its short ends is open: above/below if upright, left/right if sideways. */
export function isFree(s: CrazyQuiltState, cell: number): boolean {
  if (!s.quilt[cell]) return false;
  const r = Math.floor(cell / N),
    c = cell % N;
  const open = (rr: number, cc: number) => rr < 0 || rr >= N || cc < 0 || cc >= N || !s.quilt[rr * N + cc];
  return isUpright(cell) ? open(r - 1, c) || open(r + 1, c) : open(r, c - 1) || open(r, c + 1);
}

export function fitsFoundation(s: CrazyQuiltState, card: StandardCard, f: number): boolean {
  const top = s.foundations[f]!.at(-1)!;
  if (top.suit !== card.suit) return false;
  return f < 4 ? top.rank < 13 && card.rank === top.rank + 1 : top.rank > 1 && card.rank === top.rank - 1;
}

/** Quilt cards may also be built on the waste, up or down in suit. */
export const fitsWaste = (s: CrazyQuiltState, card: StandardCard) => {
  const top = s.waste.at(-1);
  return !!top && top.suit === card.suit && Math.abs(top.rank - card.rank) === 1;
};

export function cardAt(s: CrazyQuiltState, from: string): StandardCard | null {
  if (from === 'waste') return s.waste.at(-1) ?? null;
  if (from[0] === 'q') {
    const cell = Number(from.slice(1));
    return isFree(s, cell) ? s.quilt[cell]! : null;
  }
  return null;
}

export function canMove(s: CrazyQuiltState, from: string, to: string): boolean {
  const card = cardAt(s, from);
  if (!card) return false;
  if (to[0] === 'f') return fitsFoundation(s, card, Number(to.slice(1)));
  return to === 'waste' && from[0] === 'q' && fitsWaste(s, card);
}

export function bestTarget(s: CrazyQuiltState, from: string): string | null {
  for (let f = 0; f < 8; f++) if (canMove(s, from, `f${f}`)) return `f${f}`;
  return canMove(s, from, 'waste') ? 'waste' : null;
}

function reduce(s: CrazyQuiltState, a: CrazyQuiltAction): CrazyQuiltState {
  if (a.type === 'draw') {
    const card = s.stock.at(-1);
    if (card) return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, { ...card, faceUp: true }] };
    if (!s.redeals || !s.waste.length) return s;
    return { ...s, stock: s.waste.map((c) => ({ ...c, faceUp: false })).toReversed(), waste: [], redeals: s.redeals - 1 };
  }
  if (!canMove(s, a.from, a.to)) return s;
  const card = cardAt(s, a.from)!;
  let next: CrazyQuiltState =
    a.from === 'waste'
      ? { ...s, waste: s.waste.slice(0, -1) }
      : { ...s, quilt: s.quilt.map((c, i) => (i === Number(a.from.slice(1)) ? null : c)) };
  if (a.to === 'waste') next = { ...next, waste: [...next.waste, card] };
  else {
    const f = Number(a.to.slice(1));
    next = { ...next, foundations: next.foundations.map((p, i) => (i === f ? [...p, card] : p)) };
  }
  return next;
}

const home = (s: CrazyQuiltState) => s.foundations.reduce((n, f) => n + f.length, 0);

function hint(s: CrazyQuiltState): Hint | null {
  const sources = ['waste', ...s.quilt.map((_, i) => `q${i}`)];
  for (const from of sources)
    for (let f = 0; f < 8; f++)
      if (canMove(s, from, `f${f}`)) return { cards: [cardAt(s, from)!.id, s.foundations[f]!.at(-1)!.id] };
  return s.stock.length || (s.redeals && s.waste.length) ? { message: 'Turn the stock.' } : null;
}

export const crazyQuiltRules: GameRules<CrazyQuiltState, CrazyQuiltAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (home(s) === 104 ? 'won' : 'playing'),
  stuck: (s) => !hint(s) && home(s) < 104,
  score: home,
  summary: (s) => `${home(s)} of 104 cards home.`,
};
