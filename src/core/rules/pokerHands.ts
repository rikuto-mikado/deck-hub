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

const CATEGORY_ORDER: readonly HandCategory[] = [
  'high-card',
  'pair',
  'two-pair',
  'three-of-a-kind',
  'straight',
  'flush',
  'full-house',
  'four-of-a-kind',
  'straight-flush',
  'royal-flush',
];

/** Strength of a hand category, 0 (high card) … 9 (royal flush). */
export const categoryRank = (c: HandCategory) => CATEGORY_ORDER.indexOf(c);

export interface RankedHand {
  category: HandCategory;
  /** Category strength followed by tie-break ranks (Ace = 14), compared left to right. */
  score: number[];
  cards: StandardCard[];
}

/** Ranks a 5-card hand fully: category plus kickers in descending order of importance. */
export function rankFive(cards: readonly StandardCard[]): RankedHand {
  const { category } = evaluateHand(cards);
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(high(c.rank), (counts.get(high(c.rank)) ?? 0) + 1);
  // Group by count, then by rank: e.g. full house 8-8-8-K-K → [8, 13].
  const groups = [...counts].toSorted((a, b) => b[1] - a[1] || b[0] - a[0]).map(([v]) => v);
  let kickers = groups;
  if (category === 'straight' || category === 'straight-flush' || category === 'royal-flush') {
    const vals = groups.toSorted((a, b) => b - a);
    kickers = [vals.join() === '14,5,4,3,2' ? 5 : vals[0]!];
  }
  return { category, score: [categoryRank(category), ...kickers], cards: [...cards] };
}

/** Positive when `a` beats `b`, negative when it loses, 0 for a split pot. */
export function compareHands(a: RankedHand, b: RankedHand): number {
  for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
    const d = (a.score[i] ?? 0) - (b.score[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Best 5-card hand from 5–7 cards (Texas Hold'em: two hole cards plus the board). */
export function evaluateBestSeven(cards: readonly StandardCard[]): RankedHand {
  if (cards.length < 5) throw new Error('evaluateBestSeven needs at least 5 cards');
  let best: RankedHand | null = null;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const hand = rankFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (!best || compareHands(hand, best) > 0) best = hand;
          }
  return best!;
}
