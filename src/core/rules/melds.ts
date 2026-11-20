import type { StandardCard } from '../types/card';

/** Rummy deadwood value: Ace 1, number cards face value, court cards 10. */
export const deadwoodValue = (c: StandardCard) => Math.min(10, c.rank);

export interface MeldResult {
  melds: StandardCard[][];
  deadwood: StandardCard[];
  points: number;
}

/** Every set (3–4 of a rank) and run (3+ consecutive in a suit, Ace low) that the hand contains. */
export function candidateMelds(hand: readonly StandardCard[]): StandardCard[][] {
  const out: StandardCard[][] = [];
  const byRank = new Map<number, StandardCard[]>();
  for (const c of hand) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  for (const cards of byRank.values()) {
    if (cards.length >= 3) out.push(cards.slice(0, 4));
    if (cards.length === 4) for (let skip = 0; skip < 4; skip++) out.push(cards.filter((_, i) => i !== skip));
  }
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    const cards = hand.filter((c) => c.suit === suit).toSorted((a, b) => a.rank - b.rank);
    for (let i = 0; i < cards.length; i++) {
      let j = i;
      while (j + 1 < cards.length && cards[j + 1]!.rank === cards[j]!.rank + 1) j++;
      for (let a = i; a <= j; a++) for (let b = a + 2; b <= j; b++) out.push(cards.slice(a, b + 1));
      i = j;
    }
  }
  return out;
}

/** The meld partition that leaves the least deadwood (exhaustive search; hands are at most 11 cards). */
export function bestMelds(hand: readonly StandardCard[]): MeldResult {
  const candidates = candidateMelds(hand);
  let best: MeldResult = { melds: [], deadwood: [...hand], points: hand.reduce((n, c) => n + deadwoodValue(c), 0) };
  const search = (start: number, used: Set<string>, melds: StandardCard[][]) => {
    const deadwood = hand.filter((c) => !used.has(c.id));
    const points = deadwood.reduce((n, c) => n + deadwoodValue(c), 0);
    if (points < best.points) best = { melds: melds.slice(), deadwood, points };
    for (let i = start; i < candidates.length; i++) {
      const m = candidates[i]!;
      if (m.some((c) => used.has(c.id))) continue;
      for (const c of m) used.add(c.id);
      melds.push(m);
      search(i + 1, used, melds);
      melds.pop();
      for (const c of m) used.delete(c.id);
    }
  };
  search(0, new Set(), []);
  return best;
}

/** Lays deadwood cards off onto someone else's melds (extending sets and runs) as far as possible. */
export function layOff(
  melds: readonly StandardCard[][],
  deadwood: readonly StandardCard[],
): { melds: StandardCard[][]; deadwood: StandardCard[] } {
  const ms = melds.map((m) => m.slice());
  let rest = [...deadwood];
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of rest) {
      const target = ms.find((m) => {
        const isSet = m.every((x) => x.rank === m[0]!.rank);
        if (isSet) return m.length < 4 && c.rank === m[0]!.rank;
        const sorted = m.toSorted((a, b) => a.rank - b.rank);
        return c.suit === m[0]!.suit && (c.rank === sorted[0]!.rank - 1 || c.rank === sorted.at(-1)!.rank + 1);
      });
      if (target) {
        target.push(c);
        rest = rest.filter((x) => x !== c);
        changed = true;
        break;
      }
    }
  }
  return { melds: ms, deadwood: rest };
}
