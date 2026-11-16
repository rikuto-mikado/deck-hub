import type { StandardCard } from '../types/card';

export type HandCategory =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'pair'
  | 'high-card';

export interface HandResult {
  category: HandCategory;
  /** Ranks of the pair when category is 'pair' (Ace = 14). */
  pairRank?: number;
}

export const HAND_NAME: Record<HandCategory, string> = {
  'royal-flush': 'Royal Flush',
  'straight-flush': 'Straight Flush',
  'four-of-a-kind': 'Four of a Kind',
  'full-house': 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  'three-of-a-kind': 'Three of a Kind',
  'two-pair': 'Two Pair',
  pair: 'Pair',
  'high-card': 'High Card',
};

const high = (rank: number) => (rank === 1 ? 14 : rank);

/** Classifies a 5-card poker hand. Shared by Video Poker and any future poker game. */
export function evaluateHand(cards: readonly StandardCard[]): HandResult {
  if (cards.length !== 5) throw new Error('evaluateHand needs 5 cards');
  const values = cards.map((c) => high(c.rank)).toSorted((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.values()].toSorted((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  const unique = counts.size === 5;
  const wheel = values.join() === '2,3,4,5,14';
  const span = values[4]! - values[0]!;
  const straight = unique && (span === 4 || wheel);

  if (straight && flush) return { category: values[0] === 10 ? 'royal-flush' : 'straight-flush' };
  if (groups[0] === 4) return { category: 'four-of-a-kind' };
  if (groups[0] === 3 && groups[1] === 2) return { category: 'full-house' };
  if (flush) return { category: 'flush' };
  if (straight) return { category: 'straight' };
  if (groups[0] === 3) return { category: 'three-of-a-kind' };
  if (groups[0] === 2 && groups[1] === 2) return { category: 'two-pair' };
  if (groups[0] === 2) {
    const pairRank = [...counts].find(([, n]) => n === 2)![0];
    return { category: 'pair', pairRank };
  }
  return { category: 'high-card' };
}
