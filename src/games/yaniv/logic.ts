import { createDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type Card, type CardId } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
export const CALL_AT = 7;
export const ASSAF_PENALTY = 30;

/** Joker 0, A 1, 2–10 face value, J/Q/K 10. */
export const valueOf = (c: Card) => (c.kind === 'joker' ? 0 : Math.min(10, c.rank));
export const handTotal = (h: readonly Card[]) => h.reduce((n, c) => n + valueOf(c), 0);

export interface YanivState {
  seats: CpuSeat[];
  hands: Card[][];
  stock: Card[];
  /** Older discards, out of reach. */
  pile: Card[];
  /** The previous player's discard: its first or last card may be taken. */
  top: Card[];
  /** Cards discarded this turn, waiting for the draw. */
  pending: Card[] | null;
  turn: number;
  phase: 'play' | 'roundOver' | 'matchOver';
  scores: number[];
  limit: number;
  lastRound: { caller: number; assaf: number | null; delta: number[] } | null;
  round: number;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type YanivAction =
  | { type: 'yaniv'; by: number }
  | { type: 'discard'; by: number; ids: CardId[] }
  | { type: 'draw'; by: number; from: 'stock' | 'first' | 'last' }
  | { type: 'next' };

const sortHand = (h: Card[]) =>
  h.toSorted(
    (a, b) =>
      valueOf(a) - valueOf(b) ||
      (a.kind === 'standard' && b.kind === 'standard' ? a.rank - b.rank || a.suit.localeCompare(b.suit) : 0),
  );

function deal(s: YanivState, round: number, starter: number): YanivState {
  const rng = createRng(s.seed);
  const deck = shuffle(createDeck({ jokers: 2 }), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) => deck.splice(-5).map((c) => ({ ...c, faceUp: p === HUMAN })));
  return {
    ...s,
    hands: hands.map((h, p) => (p === HUMAN ? sortHand(h) : h)),
    top: [{ ...deck.pop()!, faceUp: true }],
    stock: deck,
    pile: [],
    pending: null,
    turn: starter,
    phase: 'play',
    round,
    seed: nextSeed(rng),
    log: `Round ${round}. ${seatName(s.seats, starter)} ${starter === HUMAN ? 'start' : 'starts'}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): YanivState {
  const seed = nextSeed(rng);
  const base = {
    seats: drawSeats(rng, PLAYERS - 1),
    hands: [],
    stock: [],
    pile: [],
    top: [],
    pending: null,
    turn: 0,
    phase: 'play' as const,
    scores: [0, 0, 0, 0],
    limit: options.limit === '100' ? 100 : 200,
    lastRound: null,
    round: 1,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1, 0);
}

/** A single card, two or more of a rank, or a run of three or more in one suit. */
export function isGroup(cards: readonly Card[]): boolean {
  if (cards.length === 1) return true;
  if (cards.some((c) => c.kind === 'joker')) return false;
  const std = cards as readonly Extract<Card, { kind: 'standard' }>[];
  if (std.every((c) => c.rank === std[0]!.rank)) return true;
  if (std.length < 3 || !std.every((c) => c.suit === std[0]!.suit)) return false;
  const ranks = std.map((c) => c.rank).toSorted((a, b) => a - b);
  return ranks.every((r, i) => i === 0 || r === ranks[i - 1]! + 1);
}

/** Orders a run low to high so its first and last cards are its ends. */
const ordered = (cards: Card[]) =>
  cards.toSorted((a, b) => (a.kind === 'standard' ? a.rank : 0) - (b.kind === 'standard' ? b.rank : 0));
export const canCall = (s: YanivState, p: number) =>
  s.phase === 'play' && s.turn === p && !s.pending && handTotal(s.hands[p]!) <= CALL_AT;

function settle(s: YanivState, caller: number): YanivState {
  const totals = s.hands.map(handTotal);
  const t = totals[caller]!;
  const challengers = totals.map((x, p) => (p !== caller && x <= t ? p : -1)).filter((p) => p >= 0);
  const assaf = challengers.length ? challengers.reduce((a, b) => (totals[b]! < totals[a]! ? b : a)) : null;
  const delta = totals.map((x, p) => (p === caller ? (assaf !== null ? ASSAF_PENALTY + t : 0) : assaf === p ? 0 : x));
  // Landing exactly on a multiple of 50 knocks 50 off.
  const scores = s.scores.map((sc, p) => {
    const n = sc + delta[p]!;
    return delta[p]! > 0 && n % 50 === 0 ? n - 50 : n;
  });
  const over = scores.some((x) => x > s.limit);
  const name = (p: number) => seatName(s.seats, p);
  return {
    ...s,
    hands: s.hands.map((h) => h.map((c) => ({ ...c, faceUp: true }))),
    scores,
    lastRound: { caller, assaf, delta },
    phase: over ? 'matchOver' : 'roundOver',
    log:
      assaf !== null
        ? `${name(caller)}: “Yaniv!” (${t}) — ${name(assaf)}: “Assaf!” (${totals[assaf]})`
        : `${name(caller)}: “Yaniv!” with ${t}. Nobody beats it.`,
  };
}

function reduce(s: YanivState, a: YanivAction): YanivState {
  if (a.type === 'next') {
    if (s.phase !== 'roundOver') return s;
    const r = s.lastRound!;
    return deal(s, s.round + 1, r.assaf ?? r.caller);
  }
  if (s.phase !== 'play' || a.by !== s.turn) return s;
  const who = seatName(s.seats, a.by);
  switch (a.type) {
    case 'yaniv':
      return canCall(s, a.by) ? settle(s, a.by) : s;
    case 'discard': {
      if (s.pending) return s;
      const cards = s.hands[a.by]!.filter((c) => a.ids.includes(c.id));
      if (cards.length !== a.ids.length || !isGroup(cards)) return s;
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => !a.ids.includes(c.id)) : h)),
        pending: ordered(cards).map((c) => ({ ...c, faceUp: true })),
        log: `${who} ${a.by === HUMAN ? 'discard' : 'discards'} ${cards.map(cardLabel).join(' ')}.`,
      };
    }
    case 'draw': {
      if (!s.pending) return s;
      let stock = s.stock,
        pile = s.pile,
        card: Card | undefined,
        rest = s.top;
      if (a.from === 'stock') {
        if (!stock.length) {
          const rng = createRng(s.seed);
          stock = shuffle(pile, rng).map((c) => ({ ...c, faceUp: false }));
          pile = [];
        }
        card = stock.at(-1);
        stock = stock.slice(0, -1);
      } else {
        card = a.from === 'first' ? s.top[0] : s.top.at(-1);
        rest = s.top.filter((c) => c !== card);
      }
      if (!card) return s;
      const hand = [...s.hands[a.by]!, { ...card, faceUp: a.by === HUMAN }];
      const next: YanivState = {
        ...s,
        stock,
        pile: [...pile, ...rest],
        top: s.pending,
        pending: null,
        hands: s.hands.map((h, p) => (p === a.by ? (p === HUMAN ? sortHand(hand) : hand) : h)),
        seed: s.seed + 1,
        turn: (a.by + 1) % PLAYERS,
        log: `${s.log} ${a.from === 'stock' ? 'Drew from the stock.' : `Took the ${cardLabel(card)}.`}`,
      };
      return next;
    }
  }
}

/** Every discardable group in a hand. */
export function groupsOf(hand: readonly Card[]): Card[][] {
  const out: Card[][] = hand.map((c) => [c]);
  const n = hand.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const cs = hand.filter((_, i) => mask & (1 << i));
    if (cs.length > 1 && isGroup(cs)) out.push(cs);
  }
  return out;
}

export function cpuMove(s: YanivState, p: number, level: CpuLevel = s.cpu): YanivAction {
  const hand = s.hands[p]!;
  const traits = TRAITS[personalityOf(s.seats, p)];
  if (canCall(s, p)) {
    const t = handTotal(hand);
    const fewest = Math.min(...s.hands.map((h, q) => (q === p ? 99 : h.length)));
    // Bold players call at once; careful ones wait for a really low hand while opponents hold few cards.
    const safeEnough = t <= (traits.risk > 0.6 ? CALL_AT : level === 'hard' ? 4 : 5) || (fewest >= 4 && t <= CALL_AT);
    if (safeEnough || level === 'easy') return { type: 'yaniv', by: p };
  }
  if (!s.pending) {
    const groups = groupsOf(hand);
    const best = groups.reduce((a, b) => (handTotal(b) > handTotal(a) ? b : a));
    return { type: 'discard', by: p, ids: best.map((c) => c.id) };
  }
  // Take a low card or one that pairs with the hand; otherwise draw blind.
  const options = (['first', 'last'] as const)
    .map((from) => ({ from, card: from === 'first' ? s.top[0] : s.top.at(-1) }))
    .filter((o) => o.card);
  const good = options.find(
    (o) =>
      valueOf(o.card!) <= 2 ||
      (level !== 'easy' &&
        o.card!.kind === 'standard' &&
        hand.some((h) => h.kind === 'standard' && h.rank === (o.card as { rank: number }).rank)),
  );
  return { type: 'draw', by: p, from: good ? good.from : 'stock' };
}

export const yanivRules: GameRules<YanivState, YanivAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.phase !== 'play' || s.turn !== HUMAN) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type === 'yaniv') return { message: 'Call Yaniv!' };
    if (a.type === 'discard') return { cards: a.ids };
    if (a.type === 'draw')
      return a.from === 'stock'
        ? { message: 'Draw from the stock.' }
        : { cards: [(a.from === 'first' ? s.top[0] : s.top.at(-1))!.id] };
    return null;
  },
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[HUMAN]! <= Math.min(...s.scores) ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase !== 'play' || s.turn === HUMAN) return null;
    const action = cpuMove(s, s.turn);
    return { action, delayMs: 260 + tempo(personalityOf(s.seats, s.turn), s.cpu, action.type === 'yaniv', `${s.stock.length}`) };
  },
  score: (s) => s.scores[HUMAN]!,
  summary: (s) => s.scores.map((x, p) => `${seatName(s.seats, p)} ${x}`).join(' · ') + ' (lowest wins)',
};
