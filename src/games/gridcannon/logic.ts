import { createDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, suitColor, type Card, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

/**
 * Perimeter slots, three per side: 0–2 above columns 0–2, 3–5 right of rows 0–2,
 * 6–8 below columns 0–2, 9–11 left of rows 0–2.
 */
export interface Royal {
  card: StandardCard;
  dead: boolean;
}

export interface GridcannonState {
  /** 3×3 stacks of number cards (2–10), Aces and Jokers; the last card is the top. */
  grid: Card[][];
  royals: (Royal | null)[];
  deck: Card[];
  /** The card drawn and waiting to be placed. */
  current: Card | null;
  /** Aces and Jokers held in reserve. */
  reserve: Card[];
  log: string;
}

export type GridcannonAction = { type: 'draw' } | { type: 'place'; cell: number } | { type: 'reserve'; id: string; cell: number };

export const ARMOR: Record<number, number> = { 11: 11, 12: 12, 13: 13 };

const up = <C extends Card>(c: C): C => ({ ...c, faceUp: true });
export const valueOf = (c: Card | undefined) => (!c || c.kind === 'joker' ? 0 : c.rank);
const isNumber = (c: Card) => c.kind === 'standard' && c.rank >= 2 && c.rank <= 10;
const isRoyal = (c: Card): c is StandardCard => c.kind === 'standard' && c.rank >= 11;

/** The grid cell beside perimeter slot `i`. */
export function cellBeside(i: number): number {
  const side = Math.floor(i / 3),
    k = i % 3;
  return side === 0 ? k : side === 1 ? k * 3 + 2 : side === 2 ? 6 + k : k * 3;
}

/** Royals go beside the most similar grid card: same suit, else same colour, else the highest. */
function placeRoyal(s: GridcannonState, card: StandardCard): GridcannonState {
  let best = -1,
    bestScore = -1;
  s.royals.forEach((r, i) => {
    if (r) return;
    const top = s.grid[cellBeside(i)]!.at(-1);
    let score = valueOf(top);
    if (top?.kind === 'standard' && top.suit === card.suit) score += 1000;
    else if (top?.kind === 'standard' && suitColor(top.suit) === suitColor(card.suit)) score += 500;
    if (score > bestScore) [best, bestScore] = [i, score];
  });
  if (best < 0) return s;
  return { ...s, royals: s.royals.map((r, i) => (i === best ? { card: up(card), dead: false } : r)) };
}

export function setup(rng: Rng): GridcannonState {
  const deck = shuffle(createDeck({ jokers: 2 }), rng);
  const grid: Card[][] = Array.from({ length: 9 }, () => []);
  const royals: StandardCard[] = [];
  const reserve: Card[] = [];
  let cell = 0;
  while (cell < 9) {
    const c = deck.pop()!;
    if (isNumber(c)) grid[cell++]!.push(up(c));
    else if (isRoyal(c)) royals.push(c);
    else reserve.push(up(c));
  }
  let s: GridcannonState = { grid, royals: Array(12).fill(null), deck, current: null, reserve, log: '' };
  for (const r of royals) s = placeRoyal(s, r);
  return { ...s, log: 'Draw a card and fire across the grid at the royals.' };
}

/** Cells where a number card may go: empty, or holding a top card of equal or lower value. */
export const canPlace = (s: GridcannonState, card: Card, cell: number) => {
  const top = s.grid[cell]?.at(-1);
  return !!s.grid[cell] && (!top || valueOf(top) <= valueOf(card));
};

interface Shot {
  slot: number;
  payload: number[];
}

/** Royals a card at `cell` fires on, with the two cells between it and them. */
export function shotsFrom(cell: number): Shot[] {
  const r = Math.floor(cell / 3),
    c = cell % 3;
  const out: Shot[] = [];
  if (r === 0) out.push({ slot: 6 + c, payload: [3 + c, 6 + c] });
  if (r === 2) out.push({ slot: c, payload: [3 + c, c] });
  if (c === 0) out.push({ slot: 3 + r, payload: [r * 3 + 1, r * 3 + 2] });
  if (c === 2) out.push({ slot: 9 + r, payload: [r * 3 + 1, r * 3] });
  return out;
}

/** Damage the payload deals: Kings only feel their own suit, Queens their colour, Jacks anything. */
export function payloadDamage(s: GridcannonState, royal: StandardCard, payload: number[]): number {
  return payload.reduce((n, cell) => {
    const top = s.grid[cell]!.at(-1);
    if (!top || top.kind !== 'standard') return n;
    if (royal.rank === 13 && top.suit !== royal.suit) return n;
    if (royal.rank === 12 && suitColor(top.suit) !== suitColor(royal.suit)) return n;
    return n + top.rank;
  }, 0);
}

function fire(s: GridcannonState, cell: number): GridcannonState {
  let next = s;
  const kills: string[] = [];
  for (const { slot, payload } of shotsFrom(cell)) {
    const target = next.royals[slot];
    if (!target || target.dead) continue;
    if (payloadDamage(next, target.card, payload) >= ARMOR[target.card.rank]!) {
      kills.push(cardLabel(target.card));
      next = { ...next, royals: next.royals.map((r, i) => (i === slot ? { ...target, dead: true } : r)) };
    }
  }
  return kills.length ? { ...next, log: `Boom! ${kills.join(' and ')} destroyed.` } : next;
}

function reduce(s: GridcannonState, a: GridcannonAction): GridcannonState {
  switch (a.type) {
    case 'draw': {
      if (s.current || !s.deck.length) return s;
      const card = up(s.deck.at(-1)!);
      const next = { ...s, deck: s.deck.slice(0, -1) };
      if (isRoyal(card)) return { ...placeRoyal(next, card), log: `A ${cardLabel(card)} takes the field.` };
      if (!isNumber(card)) return { ...next, reserve: [...next.reserve, card], log: `${cardLabel(card)} goes to your reserve.` };
      return { ...next, current: card, log: `Place the ${cardLabel(card)}.` };
    }
    case 'place': {
      const card = s.current;
      if (!card || !canPlace(s, card, a.cell)) return s;
      const placed = { ...s, current: null, grid: s.grid.map((g, i) => (i === a.cell ? [...g, card] : g)), log: '' };
      return fire(placed, a.cell);
    }
    case 'reserve': {
      // An Ace sweeps a stack back under the deck and takes its place; a Joker sits on any stack.
      const card = s.reserve.find((c) => c.id === a.id);
      if (!card || !s.grid[a.cell]) return s;
      const reserve = s.reserve.filter((c) => c.id !== a.id);
      if (card.kind === 'joker')
        return {
          ...s,
          reserve,
          grid: s.grid.map((g, i) => (i === a.cell ? [...g, card] : g)),
          log: 'The Joker resets that square.',
        };
      const swept = s.grid[a.cell]!.map((c) => ({ ...c, faceUp: false }));
      const next = {
        ...s,
        reserve,
        deck: [...swept, ...s.deck],
        grid: s.grid.map((g, i) => (i === a.cell ? [card] : g)),
        log: 'The Ace sweeps the stack back into the deck.',
      };
      return fire(next, a.cell);
    }
  }
}

const deadCount = (s: GridcannonState) => s.royals.filter((r) => r?.dead).length;

export function blocked(s: GridcannonState): boolean {
  return !!s.current && !s.grid.some((_, i) => canPlace(s, s.current!, i)) && !s.reserve.length;
}

function hint(s: GridcannonState): Hint | null {
  if (!s.current) return s.deck.length ? { message: 'Draw a card.' } : null;
  let best = -1,
    bestV = -Infinity;
  s.grid.forEach((_, cell) => {
    if (!canPlace(s, s.current!, cell)) return;
    const after = { ...s, grid: s.grid.map((g, i) => (i === cell ? [...g, s.current!] : g)) };
    const kills = deadCount(fire(after, cell)) - deadCount(s);
    // Prefer kills, then stacking on high cards (keeping low squares open).
    const v = kills * 100 + valueOf(s.grid[cell]!.at(-1)) - (s.grid[cell]!.length ? 0 : 5);
    if (v > bestV) [best, bestV] = [cell, v];
  });
  if (best < 0) return s.reserve.length ? { message: 'No square fits: use an Ace or Joker from your reserve.' } : null;
  return { cards: [s.current.id, ...(s.grid[best]!.at(-1) ? [s.grid[best]!.at(-1)!.id] : [])] };
}

export const gridcannonRules: GameRules<GridcannonState, GridcannonAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (deadCount(s) === 12) return 'won';
    if (blocked(s) || (!s.current && !s.deck.length)) return 'lost';
    return 'playing';
  },
  score: deadCount,
  summary: (s) => (deadCount(s) === 12 ? 'Every royal has fallen!' : `${deadCount(s)} of 12 royals destroyed.`),
};
