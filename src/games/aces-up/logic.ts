import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh } from '@/core/rules/trickTaking';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export interface AcesUpState {
  piles: StandardCard[][];
  stock: StandardCard[];
  discard: StandardCard[];
}

export type AcesUpAction = { type: 'deal' } | { type: 'discard'; pile: number } | { type: 'move'; from: number; to: number };

const up = (c: StandardCard) => ({ ...c, faceUp: true });

export function setup(rng: Rng): AcesUpState {
  const deck = shuffle(createStandardDeck(), rng);
  return { piles: deck.slice(-4).map((c) => [up(c)]), stock: deck.slice(0, -4), discard: [] };
}

/** A top card goes when another pile shows a higher card of the same suit (Aces high). */
export function canDiscard(s: AcesUpState, pile: number): boolean {
  const card = s.piles[pile]?.at(-1);
  if (!card) return false;
  return s.piles.some((p, i) => {
    const top = p.at(-1);
    return i !== pile && !!top && top.suit === card.suit && aceHigh(top) > aceHigh(card);
  });
}

export const canMove = (s: AcesUpState, from: number, to: number) =>
  from !== to && (s.piles[from]?.length ?? 0) > 0 && s.piles[to]?.length === 0;

function reduce(s: AcesUpState, a: AcesUpAction): AcesUpState {
  switch (a.type) {
    case 'deal': {
      if (!s.stock.length) return s;
      const n = Math.min(4, s.stock.length);
      const drawn = s.stock.slice(-n).toReversed();
      return { ...s, stock: s.stock.slice(0, -n), piles: s.piles.map((p, i) => (drawn[i] ? [...p, up(drawn[i])] : p)) };
    }
    case 'discard': {
      if (!canDiscard(s, a.pile)) return s;
      const card = s.piles[a.pile]!.at(-1)!;
      return { ...s, piles: s.piles.map((p, i) => (i === a.pile ? p.slice(0, -1) : p)), discard: [...s.discard, card] };
    }
    case 'move': {
      if (!canMove(s, a.from, a.to)) return s;
      const card = s.piles[a.from]!.at(-1)!;
      return { ...s, piles: s.piles.map((p, i) => (i === a.from ? p.slice(0, -1) : i === a.to ? [card] : p)) };
    }
  }
}

const tableauCount = (s: AcesUpState) => s.piles.reduce((n, p) => n + p.length, 0);
const won = (s: AcesUpState) => !s.stock.length && tableauCount(s) === 4 && s.piles.every((p) => p[0]?.rank === 1);
/** Moving into a space only helps when it uncovers something. */
const usefulMove = (s: AcesUpState) => s.piles.some((p) => p.length > 1) && s.piles.some((p) => !p.length);

function hint(s: AcesUpState): Hint | null {
  const d = s.piles.findIndex((_, i) => canDiscard(s, i));
  if (d >= 0) return { cards: [s.piles[d]!.at(-1)!.id] };
  if (usefulMove(s)) {
    // Move a card that sits on top of the most cards, preferring to bury nothing important.
    const from = s.piles.reduce((b, p, i) => (p.length > (s.piles[b]?.length ?? 0) ? i : b), 0);
    return { cards: [s.piles[from]!.at(-1)!.id], message: 'Fill the empty space to uncover a card.' };
  }
  return s.stock.length ? { message: 'Deal four more cards.' } : null;
}

export const acesUpRules: GameRules<AcesUpState, AcesUpAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (won(s)) return 'won';
    if (!s.stock.length && !s.piles.some((_, i) => canDiscard(s, i)) && !usefulMove(s)) return 'lost';
    return 'playing';
  },
  score: (s) => s.discard.length,
  summary: (s) => (won(s) ? 'Only the four Aces remain!' : `${tableauCount(s)} cards left on the table (4 is perfect).`),
};
