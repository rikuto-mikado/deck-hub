import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { chance, drawSeats, pick, readLevel, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;

export interface GopsState {
  seat: CpuSeat;
  /** You bid with spades, the CPU with hearts; diamonds are the prizes. */
  hands: [StandardCard[], StandardCard[]];
  prizes: StandardCard[];
  /** Prizes on the table: the current one plus any carried over from ties. */
  pot: StandardCard[];
  bids: [StandardCard | null, StandardCard | null];
  scores: [number, number];
  won: [StandardCard[], StandardCard[]];
  round: number;
  cpu: CpuLevel;
  log: string;
}

export type GopsAction = { type: 'bid'; id: CardId } | { type: 'resolve' };

const up = (c: StandardCard) => ({ ...c, faceUp: true });
const potValue = (s: GopsState) => s.pot.reduce((n, c) => n + c.rank, 0);

export function setup(rng: Rng, options: RuleOptions = {}): GopsState {
  const deck = createStandardDeck();
  const prizes = shuffle(
    deck.filter((c) => c.suit === 'diamonds'),
    rng,
  );
  const [seat] = drawSeats(rng, 1);
  return {
    seat: seat!,
    hands: [deck.filter((c) => c.suit === 'spades').map(up), deck.filter((c) => c.suit === 'hearts')],
    prizes: prizes.slice(0, -1),
    pot: [up(prizes.at(-1)!)],
    bids: [null, null],
    scores: [0, 0],
    won: [[], []],
    round: 1,
    cpu: readLevel(options),
    log: `Bid for the prize. ${seat!.name} bids at the same time.`,
  };
}

/**
 * The CPU commits to its bid before seeing yours — it is a pure function of the public state.
 * Ambitious players overbid on big prizes, conservative ones mirror the prize, tricky ones throw
 * a low card at a King to save their high cards, and skeptical ones shadow your strongest card.
 */
export function cpuBid(s: GopsState, level: CpuLevel = s.cpu): StandardCard {
  const hand = s.hands[CPU];
  const value = potValue(s);
  const key = `${s.round}${s.pot.map((c) => c.id).join()}`;
  if (level === 'easy' && chance(key) < 0.5) return hand[pick(key, hand.length)]!;
  const sorted = hand.toSorted((a, b) => a.rank - b.rank);
  const nearest = (r: number) => sorted.reduce((a, b) => (Math.abs(b.rank - r) < Math.abs(a.rank - r) ? b : a));
  const lowest = sorted[0]!,
    highest = sorted.at(-1)!;
  const theirMax = Math.max(...s.hands[HUMAN].map((c) => c.rank));
  switch (s.seat.personality) {
    case 'ambitious':
      return value >= 10 ? highest : nearest(value + 1);
    case 'conservative':
      return nearest(value + (chance(key) < 0.5 ? -1 : 1));
    case 'tricky':
      if (value >= 12 && chance(key) < 0.6) return lowest;
      return nearest(value + 2);
    case 'skeptical': {
      if (value >= 10) {
        const over = sorted.find((c) => c.rank > theirMax);
        return over ?? nearest(value);
      }
      return level === 'hard' ? lowest : nearest(value);
    }
  }
}

function reduce(s: GopsState, a: GopsAction): GopsState {
  if (a.type === 'bid') {
    if (s.bids[HUMAN] || !s.pot.length) return s;
    const mine = s.hands[HUMAN].find((c) => c.id === a.id);
    if (!mine) return s;
    const theirs = cpuBid(s);
    return {
      ...s,
      hands: [s.hands[HUMAN].filter((c) => c.id !== a.id), s.hands[CPU].filter((c) => c.id !== theirs.id)],
      bids: [up(mine), up(theirs)],
      log: `You bid ${mine.rank}, ${s.seat.name} bids ${theirs.rank}.`,
    };
  }
  const [m, t] = s.bids;
  if (!m || !t) return s;
  const value = potValue(s);
  const next = { ...s, bids: [null, null] as [null, null], round: s.round + 1 };
  const reveal = (n: GopsState): GopsState => {
    const prize = n.prizes.at(-1);
    return prize ? { ...n, prizes: n.prizes.slice(0, -1), pot: [...n.pot, up(prize)] } : n;
  };
  if (m.rank === t.rank) return { ...reveal({ ...next, pot: s.pot }), log: `A tie — the ${value} carries over!` };
  const w = m.rank > t.rank ? HUMAN : CPU;
  const scores: [number, number] = [...s.scores];
  scores[w] += value;
  const won: [StandardCard[], StandardCard[]] = [s.won[0], s.won[1]];
  won[w] = [...won[w]!, ...s.pot];
  return {
    ...reveal({ ...next, pot: [], scores, won }),
    log: `${w === HUMAN ? 'You win' : `${s.seat.name} wins`} ${value} point${value > 1 ? 's' : ''}.`,
  };
}

const over = (s: GopsState) => !s.hands[HUMAN].length && !s.bids[HUMAN];

export const gopsRules: GameRules<GopsState, GopsAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.bids[HUMAN]) return null;
    // Matching the prize's rank is a solid, hard-to-exploit default.
    const v = potValue(s);
    const card = s.hands[HUMAN].reduce((a, b) => (Math.abs(b.rank - v) < Math.abs(a.rank - v) ? b : a));
    return { cards: [card.id], message: `The pot is worth ${v}.` };
  },
  status: (s) => (!over(s) ? 'playing' : s.scores[0] > s.scores[1] ? 'won' : 'lost'),
  auto: (s) => (s.bids[HUMAN] ? { action: { type: 'resolve' }, delayMs: 700 + tempo(s.seat.personality, s.cpu) } : null),
  score: (s) => s.scores[HUMAN],
  summary: (s) => `You ${s.scores[0]} – ${s.scores[1]} ${s.seat.name}${s.scores[0] === s.scores[1] ? ' (a draw)' : ''}.`,
};
