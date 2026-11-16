import { suitColor, type StandardCard } from '../types/card';

export const isRed = (c: StandardCard) => suitColor(c.suit) === 'red';
export const sameColor = (a: StandardCard, b: StandardCard) => isRed(a) === isRed(b);

/** True when ranks differ by exactly one (optionally wrapping K↔A). */
export function isAdjacentRank(a: StandardCard, b: StandardCard, wrap = false): boolean {
  const d = Math.abs(a.rank - b.rank);
  return d === 1 || (wrap && d === 12);
}

/** Descending, alternating-color run (Klondike / FreeCell tableau). */
export function isAlternatingRun(cards: readonly StandardCard[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    const a = cards[i - 1]!,
      b = cards[i]!;
    if (!b.faceUp || a.rank !== b.rank + 1 || sameColor(a, b)) return false;
  }
  return cards.every((c) => c.faceUp);
}

/** Descending same-suit run (Spider). */
export function isSuitedRun(cards: readonly StandardCard[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    const a = cards[i - 1]!,
      b = cards[i]!;
    if (a.rank !== b.rank + 1 || a.suit !== b.suit) return false;
  }
  return cards.every((c) => c.faceUp);
}

/** Can `card` go onto a foundation whose top is `top` (A→K, same suit)? */
export function fitsFoundation(card: StandardCard, foundation: readonly StandardCard[]): boolean {
  const top = foundation[foundation.length - 1];
  return top ? top.suit === card.suit && card.rank === top.rank + 1 : card.rank === 1;
}

export function faceUp<T extends StandardCard>(cards: readonly T[]): T[] {
  return cards.map((c) => (c.faceUp ? c : { ...c, faceUp: true }));
}

export function replaceAt<T>(arr: readonly T[], i: number, value: T): T[] {
  const out = arr.slice();
  out[i] = value;
  return out;
}
