import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { isAdjacentRank } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

/** Slot geometry: x in card widths (0…9), row 0 = peak tips. */
export interface Slot {
  row: number;
  x: number;
  /** Indices of slots that cover this one. */
  coveredBy: number[];
}

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  const rowStart = [0, 3, 9, 18];
  for (let p = 0; p < 3; p++) slots.push({ row: 0, x: p * 3 + 1.5, coveredBy: [3 + 2 * p, 3 + 2 * p + 1] });
  for (let i = 0; i < 6; i++) {
    const p = Math.floor(i / 2),
      k = i % 2,
      j = p * 3 + k;
    slots.push({ row: 1, x: j + 1, coveredBy: [rowStart[2]! + j, rowStart[2]! + j + 1] });
  }
  for (let j = 0; j < 9; j++) slots.push({ row: 2, x: j + 0.5, coveredBy: [rowStart[3]! + j, rowStart[3]! + j + 1] });
  for (let j = 0; j < 10; j++) slots.push({ row: 3, x: j, coveredBy: [] });
  return slots;
}

export const SLOTS = buildSlots();

export interface TriPeaksState {
  peaks: (StandardCard | null)[];
  stock: StandardCard[];
  waste: StandardCard[];
  streak: number;
  score: number;
}

export type TriPeaksAction = { type: 'play'; slot: number } | { type: 'draw' };

export const isOpen = (s: TriPeaksState, i: number) => !!s.peaks[i] && SLOTS[i]!.coveredBy.every((j) => !s.peaks[j]);

const reveal = (s: TriPeaksState): TriPeaksState => ({
  ...s,
  peaks: s.peaks.map((c, i) => (c && !c.faceUp && isOpen(s, i) ? { ...c, faceUp: true } : c)),
});

export function canPlay(s: TriPeaksState, i: number): boolean {
  const card = s.peaks[i],
    top = s.waste.at(-1);
  return !!card && !!top && isOpen(s, i) && isAdjacentRank(card, top, true);
}

export function setup(rng: Rng): TriPeaksState {
  const deck = shuffle(createStandardDeck(), rng);
  const s: TriPeaksState = {
    peaks: deck.slice(0, 28),
    stock: deck.slice(28, 51),
    waste: [{ ...deck[51]!, faceUp: true }],
    streak: 0,
    score: 0,
  };
  return reveal(s);
}

function reduce(s: TriPeaksState, a: TriPeaksAction): TriPeaksState {
  if (a.type === 'play') {
    if (!canPlay(s, a.slot)) return s;
    const card = s.peaks[a.slot]!;
    const streak = s.streak + 1;
    const peaks = s.peaks.map((c, i) => (i === a.slot ? null : c));
    const tipBonus = SLOTS[a.slot]!.row === 0 ? 15 : 0;
    return reveal({ ...s, peaks, waste: [...s.waste, card], streak, score: s.score + streak + tipBonus });
  }
  const card = s.stock.at(-1);
  if (!card) return s;
  return {
    ...s,
    stock: s.stock.slice(0, -1),
    waste: [...s.waste, { ...card, faceUp: true }],
    streak: 0,
    score: Math.max(0, s.score - 5),
  };
}

const left = (s: TriPeaksState) => s.peaks.filter(Boolean).length;

function hint(s: TriPeaksState) {
  const slot = s.peaks.findIndex((_, i) => canPlay(s, i));
  if (slot >= 0) return { cards: [s.peaks[slot]!.id] };
  const top = s.stock.at(-1);
  return top ? { cards: [top.id], message: 'Nothing connects — turn the stock.' } : null;
}

export const triPeaksRules: GameRules<TriPeaksState, TriPeaksAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (left(s) === 0) return 'won';
    if (!s.stock.length && !s.peaks.some((_, i) => canPlay(s, i))) return 'lost';
    return 'playing';
  },
  score: (s) => s.score,
  summary: (s) => `Score ${s.score}${left(s) ? ` · ${left(s)} cards left` : ' · all peaks cleared!'}`,
};
