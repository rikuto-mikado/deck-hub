import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { HAND_NAME, evaluateHand, type HandCategory } from '@/core/rules/pokerHands';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

export const START_CREDITS = 100;
export const MAX_BET = 5;

/** Jacks or Better, full-pay 9/6. Royal flush pays 800× at max bet. */
export const PAYTABLE: { key: Payout; name: string; pays: number }[] = [
  { key: 'royal-flush', name: 'Royal Flush', pays: 250 },
  { key: 'straight-flush', name: 'Straight Flush', pays: 50 },
  { key: 'four-of-a-kind', name: 'Four of a Kind', pays: 25 },
  { key: 'full-house', name: 'Full House', pays: 9 },
  { key: 'flush', name: 'Flush', pays: 6 },
  { key: 'straight', name: 'Straight', pays: 4 },
  { key: 'three-of-a-kind', name: 'Three of a Kind', pays: 3 },
  { key: 'two-pair', name: 'Two Pair', pays: 2 },
  { key: 'jacks-or-better', name: 'Jacks or Better', pays: 1 },
];

type Payout = Exclude<HandCategory, 'pair' | 'high-card'> | 'jacks-or-better';

export function payoutFor(hand: readonly StandardCard[]): Payout | null {
  const r = evaluateHand(hand);
  if (r.category === 'pair') return (r.pairRank ?? 0) >= 11 ? 'jacks-or-better' : null;
  if (r.category === 'high-card') return null;
  return r.category;
}

export function winFor(payout: Payout | null, bet: number): number {
  if (!payout) return 0;
  if (payout === 'royal-flush' && bet === MAX_BET) return 4000;
  return PAYTABLE.find((p) => p.key === payout)!.pays * bet;
}

export interface VideoPokerState {
  phase: 'bet' | 'hold' | 'result';
  credits: number;
  bet: number;
  hand: StandardCard[];
  held: boolean[];
  deck: StandardCard[];
  seed: number;
  result: Payout | null;
  lastWin: number;
}

export type VideoPokerAction =
  { type: 'bet'; amount: number } | { type: 'deal' } | { type: 'toggle'; index: number } | { type: 'draw' };

export function setup(rng: Rng): VideoPokerState {
  return {
    phase: 'bet',
    credits: START_CREDITS,
    bet: MAX_BET,
    hand: [],
    held: [false, false, false, false, false],
    deck: shuffle(createStandardDeck(), rng),
    seed: nextSeed(rng),
    result: null,
    lastWin: 0,
  };
}

function reduce(s: VideoPokerState, a: VideoPokerAction): VideoPokerState {
  switch (a.type) {
    case 'bet':
      if (s.phase === 'hold' || a.amount < 1 || a.amount > MAX_BET) return s;
      return { ...s, bet: a.amount };
    case 'deal': {
      if (s.phase === 'hold') return s;
      const bet = Math.min(s.bet, s.credits);
      if (bet < 1) return s;
      const rng = createRng(s.seed);
      const deck = shuffle(createStandardDeck(), rng);
      return {
        ...s,
        phase: 'hold',
        bet,
        credits: s.credits - bet,
        hand: deck.slice(-5).map((c) => ({ ...c, faceUp: true })),
        deck: deck.slice(0, -5),
        held: [false, false, false, false, false],
        seed: nextSeed(rng),
        result: null,
        lastWin: 0,
      };
    }
    case 'toggle':
      if (s.phase !== 'hold' || a.index < 0 || a.index > 4) return s;
      return { ...s, held: s.held.map((h, i) => (i === a.index ? !h : h)) };
    case 'draw': {
      if (s.phase !== 'hold') return s;
      const deck = s.deck.slice();
      const hand = s.hand.map((c, i) => (s.held[i] ? c : { ...deck.pop()!, faceUp: true }));
      const result = payoutFor(hand);
      const lastWin = winFor(result, s.bet);
      return { ...s, phase: 'result', hand, deck, result, lastWin, credits: s.credits + lastWin };
    }
  }
}

const high = (c: StandardCard) => c.rank === 1 || c.rank >= 11;
const val = (c: StandardCard) => (c.rank === 1 ? 14 : c.rank);

/** Simplified Jacks-or-Better strategy: which of the five cards to keep. */
export function holdAdvice(hand: readonly StandardCard[]): number[] {
  const idx = hand.map((_, i) => i);
  const payout = payoutFor(hand);
  const counts = new Map<number, number[]>();
  hand.forEach((c, i) => counts.set(c.rank, [...(counts.get(c.rank) ?? []), i]));
  const groups = [...counts.values()].filter((g) => g.length >= 2);
  if (payout && ['royal-flush', 'straight-flush', 'four-of-a-kind', 'full-house', 'flush', 'straight'].includes(payout))
    return idx;
  if (payout) return groups.flat(); // trips, two pair, high pair
  /** The largest same-suit group of cards matching `pred`. */
  const bySuit = (pred: (c: StandardCard) => boolean): number[] =>
    (['spades', 'hearts', 'diamonds', 'clubs'] as const)
      .map((suit) => idx.filter((i) => hand[i]!.suit === suit && pred(hand[i]!)))
      .toSorted((a, b) => b.length - a.length)[0]!;
  const royal = bySuit((c) => c.rank === 1 || c.rank >= 10);
  if (royal.length >= 4) return royal;
  const flush = bySuit(() => true);
  if (royal.length === 3) return royal;
  if (flush.length === 4) return flush;
  if (groups.length) return groups[0]!; // low pair
  // Four to a straight (any four distinct values within a five-rank window, Ace high or low).
  for (const lowAce of [false, true]) {
    const v = (c: StandardCard) => (lowAce && c.rank === 1 ? 1 : val(c));
    for (let start = 1; start <= 10; start++) {
      const ids = idx.filter((i) => v(hand[i]!) >= start && v(hand[i]!) <= start + 4);
      const distinct = new Set(ids.map((i) => v(hand[i]!)));
      if (distinct.size >= 4 && ids.length >= 4) return [...distinct].map((d) => ids.find((i) => v(hand[i]!) === d)!).slice(0, 4);
    }
  }
  const highs = idx.filter((i) => high(hand[i]!));
  const suitedHigh = bySuit(high);
  if (suitedHigh.length >= 2) return suitedHigh.slice(0, 2);
  if (highs.length >= 2) return highs.toSorted((a, b) => val(hand[a]!) - val(hand[b]!)).slice(0, 2);
  return highs.slice(0, 1);
}

function hint(s: VideoPokerState) {
  if (s.phase !== 'hold') return { message: 'Bet 5 and deal for the full Royal Flush bonus.' };
  const keep = holdAdvice(s.hand);
  return keep.length
    ? { cards: keep.map((i) => s.hand[i]!.id), message: 'Hold the highlighted cards.' }
    : { message: 'Nothing worth keeping — draw five.' };
}

export const currentHandName = (s: VideoPokerState) =>
  s.hand.length === 5
    ? payoutFor(s.hand)
      ? PAYTABLE.find((p) => p.key === payoutFor(s.hand))!.name
      : HAND_NAME[evaluateHand(s.hand).category]
    : '';

export const videoPokerRules: GameRules<VideoPokerState, VideoPokerAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.credits <= 0 && s.phase !== 'hold' ? 'lost' : 'playing'),
  score: (s) => s.credits,
  summary: () => 'Out of credits.',
};
