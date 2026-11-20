import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, sortTrickHand, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import { SUIT_SYMBOL, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;

export interface OhHellState {
  seats: CpuSeat[];
  /** Hand size for each round of the match. */
  schedule: number[];
  round: number;
  hands: StandardCard[][];
  trumpCard: StandardCard;
  phase: 'bid' | 'play' | 'roundOver' | 'matchOver';
  dealer: number;
  turn: number;
  bids: (number | null)[];
  tricks: number[];
  trick: TrickPlay[];
  leader: number;
  scores: number[];
  lastRound: number[] | null;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type OhHellAction =
  { type: 'bid'; by: number; bid: number } | { type: 'play'; by: number; id: CardId } | { type: 'collect' } | { type: 'next' };

export const trumpOf = (s: OhHellState): Suit => s.trumpCard.suit;

function deal(s: OhHellState, round: number, dealer: number): OhHellState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const n = s.schedule[round]!;
  const first = (dealer + 1) % 4;
  const trumpCard = { ...deck[n * 4]!, faceUp: true };
  return {
    ...s,
    round,
    dealer,
    hands: Array.from({ length: 4 }, (_, p) =>
      sortTrickHand(deck.slice(p * n, p * n + n)).map((c) => ({ ...c, faceUp: p === HUMAN })),
    ),
    trumpCard,
    phase: 'bid',
    turn: first,
    leader: first,
    bids: [null, null, null, null],
    tricks: [0, 0, 0, 0],
    trick: [],
    seed: nextSeed(rng),
    log: `Round ${round + 1}: ${n} card${n > 1 ? 's' : ''} each, ${SUIT_SYMBOL[trumpCard.suit]} trump. Bidding starts with ${seatName(s.seats, first)}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): OhHellState {
  const schedule = options.rounds === 'down' ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
  const seed = nextSeed(rng);
  const base = {
    seats: drawSeats(rng, 3),
    schedule,
    round: 0,
    hands: [],
    trumpCard: createStandardDeck()[0]!,
    phase: 'bid' as const,
    dealer: 3,
    turn: 0,
    bids: [],
    tricks: [],
    trick: [],
    leader: 0,
    scores: [0, 0, 0, 0],
    lastRound: null,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 0, 3);
}

/** The dealer bids last and may not make the bids add up to the number of tricks (the hook). */
export function forbiddenBid(s: OhHellState, p: number): number | null {
  if (p !== s.dealer) return null;
  const others = s.bids.reduce<number>((n, b, q) => (q !== p && b !== null ? n + b : n), 0);
  const v = s.schedule[s.round]! - others;
  return v >= 0 ? v : null;
}

export function estimateBid(s: OhHellState, p: number): number {
  const hand = s.hands[p]!;
  const trump = trumpOf(s);
  let est = 0;
  for (const c of hand) {
    if (c.suit === trump) est += aceHigh(c) >= 11 ? 0.9 : 0.35;
    else if (c.rank === 1) est += 0.85;
    else if (c.rank === 13) est += hand.filter((x) => x.suit === c.suit).length >= 2 ? 0.45 : 0.2;
  }
  let bid = Math.round(est + (TRAITS[personalityOf(s.seats, p)].risk - 0.5) * 0.6);
  bid = Math.max(0, Math.min(hand.length, bid));
  const no = forbiddenBid(s, p);
  if (bid === no) bid = bid > 0 && (est < bid || bid === hand.length) ? bid - 1 : bid + 1;
  return Math.max(0, Math.min(hand.length, bid));
}

export const toAct = (s: OhHellState) => (s.phase === 'play' && s.trick.length < 4 ? (s.leader + s.trick.length) % 4 : null);
export const legal = (s: OhHellState, p: number) => legalMoves(s.hands[p]!, s.trick[0]?.card.suit ?? null);

export function cpuMove(s: OhHellState, p: number, level: CpuLevel = s.cpu): StandardCard {
  const options = legal(s, p);
  if (options.length === 1) return options[0]!;
  if (level === 'easy' && pick(`${s.seed}${p}${s.hands[p]!.length}`, 3) === 0)
    return options[pick(`${p}${s.trick.length}`, options.length)]!;
  const trump = trumpOf(s);
  const power = (c: StandardCard) => (c.suit === trump ? 100 : 0) + aceHigh(c);
  const wantWin = s.tricks[p]! < s.bids[p]!;
  const low = (cs: StandardCard[]) => cs.reduce((a, b) => (power(b) < power(a) ? b : a));
  const high = (cs: StandardCard[]) => cs.reduce((a, b) => (power(b) > power(a) ? b : a));
  if (!s.trick.length) return wantWin ? high(options) : low(options);
  const winners = options.filter((c) => trickWinner([...s.trick, { by: p, card: c }], trump).by === p);
  if (wantWin) return winners.length ? low(winners) : low(options);
  const losers = options.filter((c) => !winners.includes(c));
  return losers.length ? high(losers) : high(options);
}

function reduce(s: OhHellState, a: OhHellAction): OhHellState {
  switch (a.type) {
    case 'bid': {
      if (s.phase !== 'bid' || a.by !== s.turn || a.bid < 0 || a.bid > s.schedule[s.round]! || a.bid === forbiddenBid(s, a.by))
        return s;
      const bids = s.bids.map((b, p) => (p === a.by ? a.bid : b));
      const next = {
        ...s,
        bids,
        turn: (a.by + 1) % 4,
        log: `${seatName(s.seats, a.by)} ${a.by === HUMAN ? 'bid' : 'bids'} ${a.bid}.`,
      };
      return bids.every((b) => b !== null) ? { ...next, phase: 'play', turn: s.leader } : next;
    }
    case 'play': {
      if (toAct(s) !== a.by) return s;
      const card = legal(s, a.by).find((c) => c.id === a.id);
      if (!card) return s;
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        trick: [...s.trick, { by: a.by, card: { ...card, faceUp: true } }],
      };
    }
    case 'collect': {
      if (s.trick.length !== 4) return s;
      const w = trickWinner(s.trick, trumpOf(s)).by;
      const next = {
        ...s,
        trick: [],
        leader: w,
        tricks: s.tricks.map((t, p) => (p === w ? t + 1 : t)),
        log: `${seatName(s.seats, w)} ${w === HUMAN ? 'take' : 'takes'} the trick.`,
      };
      if (next.hands[0]!.length) return next;
      const delta = next.tricks.map((t, p) => (t === s.bids[p] ? 10 + t : 0));
      const scores = s.scores.map((x, p) => x + delta[p]!);
      const last = s.round === s.schedule.length - 1;
      return { ...next, scores, lastRound: delta, phase: last ? 'matchOver' : 'roundOver', log: `Round ${s.round + 1} scored.` };
    }
    case 'next':
      return s.phase === 'roundOver' ? deal(s, s.round + 1, (s.dealer + 1) % 4) : s;
  }
}

function hint(s: OhHellState): Hint | null {
  if (s.phase === 'bid' && s.turn === HUMAN) return { message: `About ${estimateBid(s, HUMAN)} tricks.` };
  return toAct(s) === HUMAN ? { cards: [cpuMove(s, HUMAN, 'hard').id] } : null;
}

export const ohHellRules: GameRules<OhHellState, OhHellAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[HUMAN]! >= Math.max(...s.scores) ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase === 'bid' && s.turn !== HUMAN) {
      const bid = estimateBid(s, s.turn);
      return {
        action: { type: 'bid', by: s.turn, bid },
        delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, s.turn === s.dealer),
      };
    }
    if (s.phase !== 'play') return null;
    if (s.trick.length === 4) return { action: { type: 'collect' }, delayMs: 1000 };
    const p = toAct(s);
    if (p === null || p === HUMAN) return null;
    return { action: { type: 'play', by: p, id: cpuMove(s, p).id }, delayMs: 260 + tempo(personalityOf(s.seats, p), s.cpu) };
  },
  score: (s) => s.scores[HUMAN]!,
  summary: (s) => s.scores.map((x, p) => `${seatName(s.seats, p)} ${x}`).join(' · '),
};
