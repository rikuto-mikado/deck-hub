import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, sortTrickHand, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
/** Teams: you and North (seats 0 and 2) against West and East (1 and 3). */
export const teamOf = (p: number) => p % 2;

export interface SpadesState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  phase: 'bid' | 'play' | 'handOver' | 'matchOver';
  dealer: number;
  bids: (number | null)[];
  tricks: number[];
  trick: TrickPlay[];
  leader: number;
  turn: number;
  broken: boolean;
  played: StandardCard[];
  scores: [number, number];
  bags: [number, number];
  lastHand: [number, number] | null;
  target: number;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type SpadesAction =
  { type: 'bid'; by: number; bid: number } | { type: 'play'; by: number; id: CardId } | { type: 'collect' } | { type: 'next' };

function deal(s: SpadesState, dealer: number): SpadesState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const first = (dealer + 1) % 4;
  return {
    ...s,
    hands: Array.from({ length: 4 }, (_, p) =>
      sortTrickHand(deck.slice(p * 13, p * 13 + 13)).map((c) => ({ ...c, faceUp: p === HUMAN })),
    ),
    phase: 'bid',
    dealer,
    bids: [null, null, null, null],
    tricks: [0, 0, 0, 0],
    trick: [],
    leader: first,
    turn: first,
    broken: false,
    played: [],
    seed: nextSeed(rng),
    log: `${seatName(s.seats, dealer)} ${dealer === HUMAN ? 'deal' : 'deals'}. Bidding starts with ${seatName(s.seats, first)}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): SpadesState {
  const seed = nextSeed(rng);
  const base: SpadesState = {
    seats: drawSeats(rng, 3),
    hands: [],
    phase: 'bid',
    dealer: 3,
    bids: [],
    tricks: [],
    trick: [],
    leader: 0,
    turn: 0,
    broken: false,
    played: [],
    scores: [0, 0],
    bags: [0, 0],
    lastHand: null,
    target: options.target === '300' ? 300 : 500,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 3);
}

/** Tricks a hand should take: Aces, guarded Kings, long and high spades. Personality shades it. */
export function estimateBid(s: SpadesState, p: number): number {
  const hand = s.hands[p]!;
  let est = 0;
  for (const suit of ['hearts', 'clubs', 'diamonds'] as const) {
    const cards = hand.filter((c) => c.suit === suit);
    if (cards.some((c) => c.rank === 1)) est += 1;
    if (cards.some((c) => c.rank === 13) && cards.length >= 2) est += 0.8;
    if (cards.some((c) => c.rank === 12) && cards.length >= 3) est += 0.3;
    if (cards.length <= 1) est += 0.5; // a void or singleton lets spades ruff
  }
  const spades = hand.filter((c) => c.suit === 'spades');
  for (const c of spades) if (aceHigh(c) >= 12) est += aceHigh(c) === 12 ? 0.6 : 1;
  est += Math.max(0, spades.length - 3) * 0.8;
  const risk = TRAITS[personalityOf(s.seats, p)].risk;
  const bid = Math.round(est + (risk - 0.5) * 0.8);
  // Nil: a very weak hand with no big spades, taken on by the bold.
  if (est < 1.2 && !spades.some((c) => aceHigh(c) >= 12) && risk > 0.5 && s.cpu !== 'easy') return 0;
  return Math.max(1, Math.min(13, bid));
}

export const toAct = (s: SpadesState) => (s.phase === 'play' && s.trick.length < 4 ? (s.leader + s.trick.length) % 4 : null);

export function legal(s: SpadesState, p: number): StandardCard[] {
  return legalMoves(s.hands[p]!, s.trick[0]?.card.suit ?? null, { unbrokenSuit: s.broken ? null : 'spades' });
}

const contract = (s: SpadesState, team: number) => s.bids.reduce<number>((n, b, p) => (teamOf(p) === team && b ? n + b : n), 0);
const teamTricks = (s: SpadesState, team: number) =>
  s.tricks.reduce((n, t, p) => (teamOf(p) === team && s.bids[p] ? n + t : n), 0);

const power = (c: StandardCard) => (c.suit === 'spades' ? 100 : 0) + aceHigh(c);
const low = (cs: StandardCard[]) => cs.reduce((a, b) => (power(b) < power(a) ? b : a));
const high = (cs: StandardCard[]) => cs.reduce((a, b) => (power(b) > power(a) ? b : a));

export function cpuMove(s: SpadesState, p: number, level: CpuLevel = s.cpu): StandardCard {
  const options = legal(s, p);
  if (options.length === 1) return options[0]!;
  if (level === 'easy' && pick(`${s.seed}${p}${s.played.length}`, 3) === 0)
    return options[pick(`${p}${s.played.length}`, options.length)]!;
  const nil = s.bids[p] === 0;
  const team = teamOf(p);
  const needMore = teamTricks(s, team) < contract(s, team);
  const wantWin = !nil && (needMore || (TRAITS[personalityOf(s.seats, p)].risk > 0.7 && level !== 'hard'));
  if (!s.trick.length)
    return wantWin
      ? high(options.filter((c) => c.suit !== 'spades').length ? options.filter((c) => c.suit !== 'spades') : options)
      : low(options);
  const current = trickWinner(s.trick, 'spades');
  const winners = options.filter((c) => trickWinner([...s.trick, { by: p, card: c }], 'spades').by === p);
  const partnerWinning = teamOf(current.by) === team && current.by !== p;
  if (!wantWin || partnerWinning || !winners.length) {
    const losers = options.filter((c) => !winners.includes(c));
    return losers.length ? high(losers) : low(options);
  }
  return low(winners);
}

function scoreHand(s: SpadesState): SpadesState {
  const delta: [number, number] = [0, 0];
  const bags: [number, number] = [s.bags[0], s.bags[1]];
  for (const team of [0, 1]) {
    const c = contract(s, team),
      t = teamTricks(s, team);
    if (c > 0) {
      if (t >= c) {
        delta[team]! += 10 * c + (t - c);
        bags[team]! += t - c;
      } else delta[team]! -= 10 * c;
    }
    for (const p of [team, team + 2]) {
      if (s.bids[p] !== 0) continue;
      delta[team]! += s.tricks[p] === 0 ? 100 : -100;
      bags[team]! += s.tricks[p]!;
    }
    if (bags[team]! >= 10) {
      delta[team]! -= 100;
      bags[team]! -= 10;
    }
  }
  const scores: [number, number] = [s.scores[0] + delta[0], s.scores[1] + delta[1]];
  const over = Math.max(...scores) >= s.target || Math.min(...scores) <= -s.target;
  return { ...s, scores, bags, lastHand: delta, phase: over && scores[0] !== scores[1] ? 'matchOver' : 'handOver' };
}

function reduce(s: SpadesState, a: SpadesAction): SpadesState {
  switch (a.type) {
    case 'bid': {
      if (s.phase !== 'bid' || a.by !== s.turn || a.bid < 0 || a.bid > 13) return s;
      const bids = s.bids.map((b, p) => (p === a.by ? a.bid : b));
      const done = bids.every((b) => b !== null);
      const next = {
        ...s,
        bids,
        turn: (a.by + 1) % 4,
        log: `${seatName(s.seats, a.by)} ${a.by === HUMAN ? 'bid' : 'bids'} ${a.bid === 0 ? 'Nil' : a.bid}.`,
      };
      return done
        ? {
            ...next,
            phase: 'play',
            turn: s.leader,
            log: `${next.log} ${seatName(s.seats, s.leader)} ${s.leader === HUMAN ? 'lead' : 'leads'}.`,
          }
        : next;
    }
    case 'play': {
      if (toAct(s) !== a.by) return s;
      const card = legal(s, a.by).find((c) => c.id === a.id);
      if (!card) return s;
      const shown = { ...card, faceUp: true };
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        trick: [...s.trick, { by: a.by, card: shown }],
        played: [...s.played, shown],
        broken: s.broken || card.suit === 'spades',
      };
    }
    case 'collect': {
      if (s.trick.length !== 4) return s;
      const w = trickWinner(s.trick, 'spades').by;
      const next = {
        ...s,
        trick: [],
        leader: w,
        tricks: s.tricks.map((t, p) => (p === w ? t + 1 : t)),
        log: `${seatName(s.seats, w)} ${w === HUMAN ? 'win' : 'wins'} the trick.`,
      };
      return next.hands[0]!.length ? next : scoreHand(next);
    }
    case 'next':
      return s.phase === 'handOver' ? deal(s, (s.dealer + 1) % 4) : s;
  }
}

function hint(s: SpadesState): Hint | null {
  if (s.phase === 'bid' && s.turn === HUMAN)
    return { message: `Your hand looks good for about ${estimateBid(s, HUMAN)} tricks.` };
  return toAct(s) === HUMAN ? { cards: [cpuMove(s, HUMAN, 'hard').id] } : null;
}

export const spadesRules: GameRules<SpadesState, SpadesAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[0] > s.scores[1] ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase === 'bid' && s.turn !== HUMAN) {
      const bid = estimateBid(s, s.turn);
      return { action: { type: 'bid', by: s.turn, bid }, delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, bid === 0) };
    }
    if (s.phase !== 'play') return null;
    if (s.trick.length === 4) return { action: { type: 'collect' }, delayMs: 1000 };
    const p = toAct(s);
    if (p === null || p === HUMAN) return null;
    return {
      action: { type: 'play', by: p, id: cpuMove(s, p).id },
      delayMs: 260 + tempo(personalityOf(s.seats, p), s.cpu, false, `${s.played.length}`),
    };
  },
  score: (s) => s.scores[0],
  summary: (s) =>
    `You & ${seatName(s.seats, 2)} ${s.scores[0]} – ${s.scores[1]} ${seatName(s.seats, 1)} & ${seatName(s.seats, 3)}`,
};
