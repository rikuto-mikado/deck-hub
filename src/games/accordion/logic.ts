import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export interface AccordionState {
  /** Piles in a line; only the top card of each matters. */
  piles: StandardCard[][];
  /** Pile picked up and waiting for a destination. */
  selected: number | null;
}

export type AccordionAction = { type: 'select'; pile: number } | { type: 'move'; from: number; to: number };

export function setup(rng: Rng): AccordionState {
  return { piles: shuffle(createStandardDeck(), rng).map((c) => [{ ...c, faceUp: true }]), selected: null };
}

const top = (s: AccordionState, i: number) => s.piles[i]?.at(-1);

/** A pile moves onto the pile 1 or 3 places to its left when their top cards share a suit or rank. */
export function canMove(s: AccordionState, from: number, to: number): boolean {
  if (from - to !== 1 && from - to !== 3) return false;
  const a = top(s, from),
    b = top(s, to);
  return !!a && !!b && (a.suit === b.suit || a.rank === b.rank);
}

export const targetsOf = (s: AccordionState, from: number) => [from - 1, from - 3].filter((t) => canMove(s, from, t));

function reduce(s: AccordionState, a: AccordionAction): AccordionState {
  if (a.type === 'select') {
    if (!s.piles[a.pile]) return s;
    const targets = targetsOf(s, a.pile);
    // With a pile already picked up, tapping a legal destination moves it there.
    if (s.selected !== null && canMove(s, s.selected, a.pile)) return reduce(s, { type: 'move', from: s.selected, to: a.pile });
    if (targets.length === 1) return reduce(s, { type: 'move', from: a.pile, to: targets[0]! });
    if (targets.length > 1) return { ...s, selected: s.selected === a.pile ? null : a.pile };
    return s.selected === null ? s : { ...s, selected: null };
  }
  if (!canMove(s, a.from, a.to)) return s;
  const moved = [...s.piles[a.to]!, ...s.piles[a.from]!];
  return { piles: s.piles.map((p, i) => (i === a.to ? moved : p)).filter((_, i) => i !== a.from), selected: null };
}

export function anyMove(s: AccordionState): { from: number; to: number } | null {
  // Prefer the 3-step move: it closes the line faster.
  for (let from = s.piles.length - 1; from > 0; from--) {
    if (canMove(s, from, from - 3)) return { from, to: from - 3 };
    if (canMove(s, from, from - 1)) return { from, to: from - 1 };
  }
  return null;
}

function hint(s: AccordionState): Hint | null {
  const m = anyMove(s);
  return m ? { cards: [top(s, m.from)!.id, top(s, m.to)!.id] } : null;
}

export const accordionRules: GameRules<AccordionState, AccordionAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.piles.length === 1 ? 'won' : anyMove(s) ? 'playing' : 'lost'),
  score: (s) => s.piles.length,
  summary: (s) => (s.piles.length === 1 ? 'One single pile — a perfect accordion!' : `${s.piles.length} piles left (1 wins).`),
};
