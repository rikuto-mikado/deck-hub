import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh } from '@/core/rules/trickTaking';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

export const START_CHIPS = 500;
export const BETS = [10, 25, 50, 100] as const;
export const GOAL_CHIPS = 1000;
const DECKS = 6;

/** Pays for a spread of 1, 2, 3, or 4+ cards. */
export const SPREAD_PAYS = [5, 4, 2, 1] as const;
export const TRIPS_PAYS = 11;

export interface RedDogState {
  chips: number;
  bet: number;
  /** Total staked this hand (doubles on a raise). */
  stake: number;
  phase: 'bet' | 'raise' | 'third' | 'settled';
  cards: StandardCard[];
  shoe: StandardCard[];
  seed: number;
  message: string;
}

export type RedDogAction =
  { type: 'bet'; amount: number } | { type: 'deal' } | { type: 'raise' } | { type: 'stand' } | { type: 'third' };

const shoeOf = (seed: number) => shuffle(createStandardDeck({ decks: DECKS }), createRng(seed));

export function setup(rng: Rng): RedDogState {
  return {
    chips: START_CHIPS,
    bet: BETS[0],
    stake: 0,
    phase: 'bet',
    cards: [],
    shoe: shoeOf(nextSeed(rng)),
    seed: nextSeed(rng),
    message: 'Place a bet and deal two cards.',
  };
}

/** Cards strictly between the two (Aces high), or -1 for a pair and 0 for consecutive cards. */
export function spreadOf(a: StandardCard, b: StandardCard): number {
  if (a.rank === b.rank) return -1;
  return Math.abs(aceHigh(a) - aceHigh(b)) - 1;
}

export const spreadPays = (spread: number) => SPREAD_PAYS[Math.min(spread, 4) - 1]!;

function draw(s: RedDogState): [StandardCard, RedDogState] {
  const shoe = s.shoe.length < 8 ? shoeOf(s.seed) : s.shoe;
  return [
    { ...shoe.at(-1)!, faceUp: true },
    { ...s, shoe: shoe.slice(0, -1), seed: s.seed + 1 },
  ];
}

function settle(s: RedDogState, returned: number, message: string): RedDogState {
  const chips = s.chips + returned;
  return { ...s, phase: 'settled', chips, bet: Math.min(s.bet, Math.max(BETS[0], chips)), message };
}

function reduce(s: RedDogState, a: RedDogAction): RedDogState {
  const betting = s.phase === 'bet' || s.phase === 'settled';
  switch (a.type) {
    case 'bet':
      return betting && a.amount <= s.chips && a.amount !== s.bet ? { ...s, bet: a.amount } : s;
    case 'deal': {
      if (!betting || s.bet > s.chips) return s;
      let next: RedDogState = { ...s, chips: s.chips - s.bet, stake: s.bet, cards: [] };
      const [x, n1] = draw(next);
      const [y, n2] = draw(n1);
      next = { ...n2, cards: [x, y] };
      const spread = spreadOf(x, y);
      if (spread === 0) return settle(next, next.stake, 'Consecutive cards — a push. Your bet is returned.');
      if (spread === -1)
        return { ...next, phase: 'third', message: 'A pair! The third card is drawn for three of a kind (11:1).' };
      return {
        ...next,
        phase: 'raise',
        message: `Spread of ${spread} — pays ${spreadPays(spread)}:1. Raise (double) or stand?`,
      };
    }
    case 'raise':
      if (s.phase !== 'raise' || s.chips < s.stake) return s;
      return { ...s, chips: s.chips - s.stake, stake: s.stake * 2, phase: 'third', message: 'Raised! Drawing the third card…' };
    case 'stand':
      return s.phase === 'raise' ? { ...s, phase: 'third', message: 'Drawing the third card…' } : s;
    case 'third': {
      if (s.phase !== 'third') return s;
      const [z, next0] = draw(s);
      const next = { ...next0, cards: [...s.cards, z] };
      const [x, y] = s.cards as [StandardCard, StandardCard];
      if (x.rank === y.rank) {
        return z.rank === x.rank
          ? settle(next, s.stake * (TRIPS_PAYS + 1), `Three of a kind! You win ${s.stake * TRIPS_PAYS}.`)
          : settle(next, s.stake, 'No third match — a push.');
      }
      const lo = Math.min(aceHigh(x), aceHigh(y)),
        hi = Math.max(aceHigh(x), aceHigh(y));
      if (aceHigh(z) > lo && aceHigh(z) < hi) {
        const pays = spreadPays(spreadOf(x, y));
        return settle(next, s.stake * (pays + 1), `In between! You win ${s.stake * pays}.`);
      }
      return settle(next, 0, `Outside the spread — you lose ${s.stake}.`);
    }
  }
}

export const redDogRules: GameRules<RedDogState, RedDogAction> = {
  setup,
  reduce,
  status: (s) => {
    if (s.phase !== 'bet' && s.phase !== 'settled') return 'playing';
    if (s.chips >= GOAL_CHIPS) return 'won';
    return s.chips < BETS[0] ? 'lost' : 'playing';
  },
  auto: (s) => (s.phase === 'third' ? { action: { type: 'third' }, delayMs: 900 } : null),
  hint: (s) => {
    if (s.phase !== 'raise') return null;
    const spread = spreadOf(s.cards[0]!, s.cards[1]!);
    // Raising has positive expectation only on wide spreads.
    return { message: spread >= 7 ? 'A wide spread — raising is a good bet.' : 'A narrow spread — just stand.' };
  },
  score: (s) => s.chips,
  summary: (s) => (s.chips >= GOAL_CHIPS ? `You doubled your bankroll: ${s.chips} chips.` : 'You are out of chips.'),
};
