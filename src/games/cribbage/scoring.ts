import type { StandardCard } from '@/core/types/card';

export interface ScoreItem {
  label: string;
  points: number;
}

/** Counting value: Ace 1, court cards 10. */
export const countValue = (c: StandardCard) => Math.min(10, c.rank);

/**
 * Scores a four-card hand (or crib) with the starter: fifteens, pairs, runs, flush and his nobs.
 * Returns each scoring combination as a labelled badge so players can check the count.
 */
export function scoreCribbageHand(
  four: readonly StandardCard[],
  starter: StandardCard | null,
  isCrib = false,
): { total: number; items: ScoreItem[] } {
  const cards = starter ? [...four, starter] : [...four];
  const n = cards.length;
  const items: ScoreItem[] = [];
  // Fifteens: every subset adding to 15.
  let fifteens = 0;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += countValue(cards[i]!);
    if (sum === 15) fifteens++;
  }
  if (fifteens) items.push({ label: `15 ×${fifteens}`, points: fifteens * 2 });
  // Pairs: every pair of equal rank.
  let pairs = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (cards[i]!.rank === cards[j]!.rank) pairs++;
  if (pairs)
    items.push({
      label: pairs === 1 ? 'pair' : pairs === 3 ? 'three of a kind' : pairs === 6 ? 'four of a kind' : `${pairs} pairs`,
      points: pairs * 2,
    });
  // Runs: the longest run, counted once per way it can be made.
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  let bestLen = 0,
    ways = 0;
  for (let start = 1; start <= 13; start++) {
    let len = 0,
      mult = 1;
    while (counts.get(start + len)) {
      mult *= counts.get(start + len)!;
      len++;
    }
    if (len >= 3 && len > bestLen) [bestLen, ways] = [len, mult];
    else if (len >= 3 && len === bestLen) ways += mult;
  }
  if (bestLen) items.push({ label: ways > 1 ? `${ways} runs of ${bestLen}` : `run of ${bestLen}`, points: bestLen * ways });
  // Flush: four in the hand (not the crib), five with the starter.
  if (four.every((c) => c.suit === four[0]!.suit)) {
    if (starter?.suit === four[0]!.suit) items.push({ label: 'flush of 5', points: 5 });
    else if (!isCrib) items.push({ label: 'flush', points: 4 });
  }
  if (starter && four.some((c) => c.rank === 11 && c.suit === starter.suit)) items.push({ label: 'his nobs', points: 1 });
  return { total: items.reduce((sum, i) => sum + i.points, 0), items };
}

/** Points for the card just played during the pegging: 15, 31, pairs and runs on the pile. */
export function peggingPoints(pile: readonly StandardCard[]): ScoreItem[] {
  const items: ScoreItem[] = [];
  const count = pile.reduce((n, c) => n + countValue(c), 0);
  if (count === 15) items.push({ label: 'fifteen', points: 2 });
  if (count === 31) items.push({ label: 'thirty-one', points: 2 });
  const last = pile.at(-1)!;
  let same = 1;
  for (let i = pile.length - 2; i >= 0 && pile[i]!.rank === last.rank; i--) same++;
  if (same >= 2)
    items.push({
      label: same === 2 ? 'pair' : same === 3 ? 'pair royal' : 'double pair royal',
      points: same === 2 ? 2 : same === 3 ? 6 : 12,
    });
  for (let len = pile.length; len >= 3; len--) {
    const ranks = pile
      .slice(-len)
      .map((c) => c.rank)
      .toSorted((a, b) => a - b);
    if (ranks.every((r, i) => i === 0 || r === ranks[i - 1]! + 1)) {
      items.push({ label: `run of ${len}`, points: len });
      break;
    }
  }
  return items;
}
