import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

/** Pile index for a rank: Ace…Queen sit at 1…12 o'clock (indexes 0…11), Kings in the centre (12). */
export const pileOf = (rank: number) => rank - 1;
export const CENTER = 12;

export interface ClockState {
  /** 13 piles; the end of each array is the top. Turned cards are slipped face up underneath. */
  piles: StandardCard[][];
  /** Pile to turn the next card from. */
  next: number;
  turned: number;
}

export type ClockAction = { type: 'turn' };

export function setup(rng: Rng): ClockState {
  const deck = shuffle(createStandardDeck(), rng);
  return { piles: Array.from({ length: 13 }, (_, i) => deck.slice(i * 4, i * 4 + 4)), next: CENTER, turned: 0 };
}

export const kingsUp = (s: ClockState) => s.piles[CENTER]!.filter((c) => c.faceUp).length;
const hidden = (p: readonly StandardCard[]) => p.filter((c) => !c.faceUp).length;

/** Turns the top face-down card of the current pile and slides it under the pile of its rank. */
function reduce(s: ClockState, _a: ClockAction): ClockState {
  if (kingsUp(s) === 4) return s;
  const pile = s.piles[s.next]!;
  const at = pile.findLastIndex((c) => !c.faceUp);
  if (at < 0) return s;
  const card = { ...pile[at]!, faceUp: true };
  const dest = pileOf(card.rank);
  const piles = s.piles.map((p, i) => (i === s.next ? p.filter((_, j) => j !== at) : p));
  piles[dest] = [card, ...piles[dest]!];
  return { piles, next: dest, turned: s.turned + 1 };
}

export const clockRules: GameRules<ClockState, ClockAction> = {
  setup,
  reduce,
  status: (s) => {
    if (s.turned === 52) return 'won';
    if (kingsUp(s) === 4 || !hidden(s.piles[s.next]!)) return 'lost';
    return 'playing';
  },
  hint: (s) => {
    const top = s.piles[s.next]!.findLast((c) => !c.faceUp);
    return top ? { cards: [top.id], message: 'Turn the top card of the glowing pile.' } : null;
  },
  score: (s) => s.turned,
  summary: (s) =>
    s.turned === 52 ? 'Every card found its hour!' : `The fourth King came up with ${52 - s.turned} cards still hidden.`,
};
