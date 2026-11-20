import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules } from '@/core/types/game';

export const START_CHIPS = 1000;
export const BETS = [20, 40, 100, 200] as const;
/** Doubling the bankroll wins the session. */
export const GOAL_CHIPS = 2000;
const DECKS = 8;

export type Side = 'player' | 'banker' | 'tie';
export type Result = Side;

export interface BaccaratState {
  chips: number;
  bet: number;
  side: Side;
  phase: 'bet' | 'dealing' | 'settled';
  shoe: StandardCard[];
  player: StandardCard[];
  banker: StandardCard[];
  seed: number;
  message: string;
  /** Recent results, newest last (the "bead road"). */
  road: Result[];
}

export type BaccaratAction =
  { type: 'bet'; amount: number } | { type: 'side'; side: Side } | { type: 'deal' } | { type: 'draw' } | { type: 'settle' };

/** 2–9 face value, 10/J/Q/K zero, Ace one. */
export const pointOf = (c: StandardCard) => (c.rank >= 10 ? 0 : c.rank);
export const handTotal = (cards: readonly StandardCard[]) => cards.reduce((n, c) => n + pointOf(c), 0) % 10;

function freshShoe(seed: number): StandardCard[] {
  return shuffle(createStandardDeck({ decks: DECKS }), createRng(seed));
}

export function setup(rng: Rng): BaccaratState {
  const seed = nextSeed(rng);
  return {
    chips: START_CHIPS,
    bet: BETS[0],
    side: 'banker',
    phase: 'bet',
    shoe: freshShoe(seed),
    player: [],
    banker: [],
    seed: nextSeed(rng),
    message: 'Place your bet on Player, Banker or Tie.',
    road: [],
  };
}

/**
 * Who draws next under the fixed third-card tableau, or null when both hands stand.
 * Naturals (8 or 9 on two cards) stop everything.
 */
export function nextDraw(s: Pick<BaccaratState, 'player' | 'banker'>): 'player' | 'banker' | null {
  const p = handTotal(s.player),
    b = handTotal(s.banker);
  if (s.player.length === 2 && s.banker.length === 2 && (p >= 8 || b >= 8)) return null;
  if (s.player.length === 2) {
    if (p <= 5) return 'player';
    // Player stood on 6 or 7: Banker draws on 0–5.
    return s.banker.length === 2 && b <= 5 ? 'banker' : null;
  }
  if (s.banker.length > 2) return null;
  const third = pointOf(s.player[2]!);
  const draws =
    b <= 2 ||
    (b === 3 && third !== 8) ||
    (b === 4 && third >= 2 && third <= 7) ||
    (b === 5 && third >= 4 && third <= 7) ||
    (b === 6 && (third === 6 || third === 7));
  return draws ? 'banker' : null;
}

function take(s: BaccaratState): [StandardCard, StandardCard[]] {
  // Reshuffle when the shoe runs low (the cut card), using the stored seed.
  const shoe = s.shoe.length < 6 ? freshShoe(s.seed) : s.shoe;
  return [{ ...shoe.at(-1)!, faceUp: true }, shoe.slice(0, -1)];
}

export function resultOf(s: Pick<BaccaratState, 'player' | 'banker'>): Result {
  const p = handTotal(s.player),
    b = handTotal(s.banker);
  return p > b ? 'player' : b > p ? 'banker' : 'tie';
}

/** Net return (stake included) for a bet on `side` when `result` comes up. */
export function payout(side: Side, bet: number, result: Result): number {
  if (result === 'tie') return side === 'tie' ? bet * 9 : bet; // Player/Banker bets push on a tie
  if (side !== result) return 0;
  return side === 'banker' ? bet + Math.floor(bet * 0.95) : bet * 2;
}

const NAME: Record<Side, string> = { player: 'Player', banker: 'Banker', tie: 'Tie' };

function reduce(s: BaccaratState, a: BaccaratAction): BaccaratState {
  const betting = s.phase === 'bet' || s.phase === 'settled';
  switch (a.type) {
    case 'bet':
      return betting && a.amount <= s.chips && a.amount !== s.bet ? { ...s, bet: a.amount } : s;
    case 'side':
      return betting && a.side !== s.side ? { ...s, side: a.side } : s;
    case 'deal': {
      if (!betting || s.bet > s.chips) return s;
      let next: BaccaratState = {
        ...s,
        chips: s.chips - s.bet,
        player: [],
        banker: [],
        phase: 'dealing',
        seed: s.seed ^ 0x5bd1e995,
      };
      // Player, Banker, Player, Banker.
      for (const who of ['player', 'banker', 'player', 'banker'] as const) {
        const [card, shoe] = take(next);
        next = { ...next, shoe, [who]: [...next[who], card] };
      }
      return { ...next, message: `Player ${handTotal(next.player)} · Banker ${handTotal(next.banker)}` };
    }
    case 'draw': {
      const who = s.phase === 'dealing' ? nextDraw(s) : null;
      if (!who) return s;
      const [card, shoe] = take(s);
      const next = { ...s, shoe, [who]: [...s[who], card] };
      return { ...next, message: `${NAME[who]} draws a third card.` };
    }
    case 'settle': {
      if (s.phase !== 'dealing' || nextDraw(s)) return s;
      const result = resultOf(s);
      const won = payout(s.side, s.bet, result);
      const natural = s.player.length === 2 && s.banker.length === 2 && Math.max(handTotal(s.player), handTotal(s.banker)) >= 8;
      const head = `${natural ? 'Natural! ' : ''}${result === 'tie' ? `Tie at ${handTotal(s.player)}` : `${NAME[result]} wins ${Math.max(handTotal(s.player), handTotal(s.banker))} to ${Math.min(handTotal(s.player), handTotal(s.banker))}`}.`;
      const tail = won > s.bet ? ` You win ${won - s.bet}.` : won === s.bet ? ' Your bet is returned.' : ` You lose ${s.bet}.`;
      return {
        ...s,
        phase: 'settled',
        chips: s.chips + won,
        bet: Math.min(s.bet, Math.max(BETS[0], s.chips + won)),
        road: [...s.road, result].slice(-36),
        message: head + tail,
      };
    }
  }
}

export const baccaratRules: GameRules<BaccaratState, BaccaratAction> = {
  setup,
  reduce,
  status: (s) => {
    if (s.phase === 'dealing') return 'playing';
    if (s.chips >= GOAL_CHIPS) return 'won';
    return s.chips < BETS[0] ? 'lost' : 'playing';
  },
  auto: (s) => {
    if (s.phase !== 'dealing') return null;
    return nextDraw(s) ? { action: { type: 'draw' }, delayMs: 900 } : { action: { type: 'settle' }, delayMs: 800 };
  },
  score: (s) => s.chips,
  summary: (s) => (s.chips >= GOAL_CHIPS ? `You doubled your bankroll: ${s.chips} chips.` : 'You are out of chips.'),
};
