import { SUITS, type Card, type StandardCard, type Suit } from '@/core/types/card';

/** 3 is weakest (0), 2 strongest (12). */
export const strengthOf = (c: StandardCard) => (c.rank + 10) % 13;
export const JOKER = 13;
export const S_EIGHT = 5; // strength of an 8
export const S_JACK = 8; // strength of a J
export const S_TWO = 12;
export const S_THREE = 0;

export interface Shape {
  kind: 'group' | 'stairs';
  count: number;
  /** Strength range covered (equal for groups; 13 for a group made only of Jokers). */
  low: number;
  high: number;
  /** Suits of the natural cards (Jokers are wild). */
  suits: Suit[];
  jokers: number;
  jokersOnly: boolean;
}

const naturalsOf = (cards: readonly Card[]) => cards.filter((c): c is StandardCard => c.kind === 'standard');

/** Every way the cards can be read as one legal play. A Joker-heavy set may be a group or stairs. */
export function shapesOf(cards: readonly Card[], allowStairs: boolean, preferHigh: boolean): Shape[] {
  const n = cards.length;
  if (!n) return [];
  const nat = naturalsOf(cards);
  const jokers = n - nat.length;
  const suits = nat.map((c) => c.suit).toSorted((a, b) => SUITS.indexOf(a) - SUITS.indexOf(b));
  const out: Shape[] = [];

  if (!nat.length) {
    if (n <= 2) out.push({ kind: 'group', count: n, low: JOKER, high: JOKER, suits: [], jokers, jokersOnly: true });
    return out;
  }
  // Group: every natural card has the same rank (up to 4 + Jokers as wild).
  const s0 = strengthOf(nat[0]!);
  if (nat.every((c) => strengthOf(c) === s0) && n <= 6) {
    out.push({ kind: 'group', count: n, low: s0, high: s0, suits, jokers, jokersOnly: false });
  }
  // Stairs: 3+ consecutive ranks of one suit, Jokers filling gaps or ends. 2 is the top; no wrap.
  if (allowStairs && n >= 3 && nat.every((c) => c.suit === nat[0]!.suit)) {
    const ss = nat.map(strengthOf).toSorted((a, b) => a - b);
    if (new Set(ss).size === ss.length) {
      const lo = ss[0]!,
        hi = ss.at(-1)!;
      // The run's lowest strength can sit anywhere that still covers every natural card and stays within 3…2.
      const lowMin = Math.max(0, hi - (n - 1));
      const lowMax = Math.min(lo, 12 - (n - 1));
      if (lowMin <= lowMax) {
        // Leftover Jokers go on the end that helps under the current direction.
        const low = preferHigh ? lowMax : lowMin;
        out.push({ kind: 'stairs', count: n, low, high: low + n - 1, suits: [nat[0]!.suit], jokers, jokersOnly: false });
      }
    }
  }
  return out;
}

export const includesStrength = (s: Shape, strength: number) => !s.jokersOnly && s.low <= strength && strength <= s.high;
