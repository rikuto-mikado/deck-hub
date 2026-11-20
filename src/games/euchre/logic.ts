import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import { SUITS, SUIT_SYMBOL, suitColor, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const teamOf = (p: number) => p % 2;
const partnerOf = (p: number) => (p + 2) % 4;

export interface EuchreState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  upcard: StandardCard;
  phase: 'order1' | 'order2' | 'discard' | 'play' | 'handOver' | 'matchOver';
  dealer: number;
  turn: number;
  trump: Suit | null;
  maker: number | null;
  alone: boolean;
  trick: TrickPlay[];
  leader: number;
  tricks: number[];
  scores: [number, number];
  target: number;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type EuchreAction =
  | { type: 'order'; by: number; alone: boolean }
  | { type: 'pass'; by: number }
  | { type: 'name'; by: number; suit: Suit; alone: boolean }
  | { type: 'discard'; id: CardId }
  | { type: 'play'; by: number; id: CardId }
  | { type: 'collect' }
  | { type: 'next' };

const sameColorSuit = (s: Suit): Suit => SUITS.find((x) => x !== s && suitColor(x) === suitColor(s))!;
export const isRight = (c: StandardCard, trump: Suit | null) => !!trump && c.rank === 11 && c.suit === trump;
export const isLeft = (c: StandardCard, trump: Suit | null) => !!trump && c.rank === 11 && c.suit === sameColorSuit(trump);
/** The Left Bower belongs to the trump suit. */
export const suitIn =
  (trump: Suit | null) =>
  (c: StandardCard): Suit =>
    isLeft(c, trump) ? trump! : c.suit;
export const powerIn = (trump: Suit | null) => (c: StandardCard) => (isRight(c, trump) ? 30 : isLeft(c, trump) ? 29 : aceHigh(c));

const sortHand = (h: StandardCard[], trump: Suit | null) =>
  h.toSorted((a, b) => {
    const sa = suitIn(trump)(a),
      sb = suitIn(trump)(b);
    if (sa !== sb) return (sa === trump ? -1 : SUITS.indexOf(sa)) - (sb === trump ? -1 : SUITS.indexOf(sb));
    return powerIn(trump)(b) - powerIn(trump)(a);
  });

function deal(s: EuchreState, dealer: number): EuchreState {
  const rng = createRng(s.seed);
  const deck = shuffle(
    createStandardDeck().filter((c) => c.rank === 1 || c.rank >= 9),
    rng,
  );
  const first = (dealer + 1) % 4;
  return {
    ...s,
    hands: Array.from({ length: 4 }, (_, p) =>
      sortHand(deck.slice(p * 5, p * 5 + 5), null).map((c) => ({ ...c, faceUp: p === HUMAN })),
    ),
    upcard: { ...deck[20]!, faceUp: true },
    phase: 'order1',
    dealer,
    turn: first,
    trump: null,
    maker: null,
    alone: false,
    trick: [],
    leader: first,
    tricks: [0, 0, 0, 0],
    seed: nextSeed(rng),
    log: `${seatName(s.seats, dealer)} ${dealer === HUMAN ? 'deal' : 'deals'}; the ${SUIT_SYMBOL[deck[20]!.suit]} is turned up.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): EuchreState {
  const seed = nextSeed(rng);
  const base = {
    seats: drawSeats(rng, 3),
    hands: [],
    upcard: createStandardDeck()[0]!,
    phase: 'order1' as const,
    dealer: 3,
    turn: 0,
    trump: null,
    maker: null,
    alone: false,
    trick: [],
    leader: 0,
    tricks: [0, 0, 0, 0],
    scores: [0, 0] as [number, number],
    target: options.target === '5' ? 5 : 10,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 3);
}

/** Hand strength with `trump`: bowers, high trumps and off-suit Aces. */
export function strength(hand: readonly StandardCard[], trump: Suit): number {
  let v = 0;
  for (const c of hand) {
    if (isRight(c, trump)) v += 3;
    else if (isLeft(c, trump)) v += 2.5;
    else if (c.suit === trump) v += c.rank === 1 ? 2 : c.rank === 13 ? 1.5 : c.rank === 12 ? 1.1 : 0.8;
    else if (c.rank === 1) v += 1;
  }
  return v;
}

const sitsOut = (s: EuchreState, p: number) => s.alone && s.maker !== null && p === partnerOf(s.maker);
const nextSeat = (s: EuchreState, p: number) => {
  let q = (p + 1) % 4;
  if (sitsOut(s, q)) q = (q + 1) % 4;
  return q;
};
const activeCount = (s: EuchreState) => (s.alone ? 3 : 4);

export const toAct = (s: EuchreState): number | null => {
  if (s.phase !== 'play' || s.trick.length >= activeCount(s)) return null;
  let p = s.leader;
  for (let i = 0; i < s.trick.length; i++) p = nextSeat(s, p);
  return p;
};

export const legal = (s: EuchreState, p: number) =>
  legalMoves(s.hands[p]!, s.trick[0] ? suitIn(s.trump)(s.trick[0].card) : null, { suitOf: suitIn(s.trump) });

function startPlay(s: EuchreState, maker: number, trump: Suit, alone: boolean, how: string): EuchreState {
  const next = { ...s, maker, trump, alone, hands: s.hands.map((h, p) => (p === HUMAN ? sortHand(h, trump) : h)) };
  let leader = (s.dealer + 1) % 4;
  if (sitsOut(next, leader)) leader = (leader + 1) % 4;
  return {
    ...next,
    phase: 'play',
    leader,
    log: `${seatName(s.seats, maker)} ${how} ${SUIT_SYMBOL[trump]}${alone ? ', going alone!' : '.'}`,
  };
}

/** CPU decision for the bidding rounds: order, name, or pass. */
export function cpuBid(s: EuchreState, p: number): EuchreAction {
  const risk = TRAITS[personalityOf(s.seats, p)].risk;
  const threshold = 6.2 - risk * 1.6 + (s.cpu === 'easy' ? 0.8 : 0);
  if (s.phase === 'order1') {
    const hand = p === s.dealer ? [...s.hands[p]!, s.upcard] : s.hands[p]!;
    let v = strength(hand, s.upcard.suit);
    // Ordering the card into an opponent dealer's hand gives them a trump.
    if (p !== s.dealer && teamOf(p) !== teamOf(s.dealer)) v -= 0.6;
    if (p !== s.dealer && teamOf(p) === teamOf(s.dealer)) v += 0.5;
    return v >= threshold ? { type: 'order', by: p, alone: v >= threshold + 4 } : { type: 'pass', by: p };
  }
  const options = SUITS.filter((x) => x !== s.upcard.suit);
  const best = options.reduce((a, b) => (strength(s.hands[p]!, b) > strength(s.hands[p]!, a) ? b : a));
  const v = strength(s.hands[p]!, best);
  if (v >= threshold - 0.3 || p === s.dealer) return { type: 'name', by: p, suit: best, alone: v >= threshold + 4 };
  return { type: 'pass', by: p };
}

export function cpuMove(s: EuchreState, p: number, level: CpuLevel = s.cpu): StandardCard {
  const options = legal(s, p);
  if (options.length === 1) return options[0]!;
  if (level === 'easy' && pick(`${s.seed}${p}${s.hands[p]!.length}`, 3) === 0) return options[pick(`${p}`, options.length)]!;
  const pw = (c: StandardCard) => (suitIn(s.trump)(c) === s.trump ? 100 : 0) + powerIn(s.trump)(c);
  const low = (cs: StandardCard[]) => cs.reduce((a, b) => (pw(b) < pw(a) ? b : a));
  const high = (cs: StandardCard[]) => cs.reduce((a, b) => (pw(b) > pw(a) ? b : a));
  if (!s.trick.length) {
    const offAces = options.filter((c) => c.rank === 1 && suitIn(s.trump)(c) !== s.trump);
    if (teamOf(p) === teamOf(s.maker!) && options.some((c) => isRight(c, s.trump)))
      return options.find((c) => isRight(c, s.trump))!;
    return offAces.length ? offAces[0]! : high(options);
  }
  const opts = { suitOf: suitIn(s.trump), power: powerIn(s.trump) };
  const current = trickWinner(s.trick, s.trump, opts);
  if (teamOf(current.by) === teamOf(p)) return low(options);
  const winners = options.filter((c) => trickWinner([...s.trick, { by: p, card: c }], s.trump, opts).by === p);
  return winners.length ? low(winners) : low(options);
}

function reduce(s: EuchreState, a: EuchreAction): EuchreState {
  switch (a.type) {
    case 'order': {
      if (s.phase !== 'order1' || a.by !== s.turn) return s;
      const hands = s.hands.map((h, p) => (p === s.dealer ? [...h, { ...s.upcard, faceUp: p === HUMAN }] : h));
      const next = startPlay({ ...s, hands }, a.by, s.upcard.suit, a.alone, 'ordered up');
      if (s.dealer === HUMAN) return { ...next, phase: 'discard', log: `${next.log} Discard one card.` };
      // A CPU dealer throws away its weakest card.
      const d = s.dealer;
      const pw = (c: StandardCard) => (suitIn(next.trump)(c) === next.trump ? 100 : 0) + powerIn(next.trump)(c);
      const worst = next.hands[d]!.reduce((x, y) => (pw(y) < pw(x) ? y : x));
      return { ...next, hands: next.hands.map((h, p) => (p === d ? h.filter((c) => c.id !== worst.id) : h)) };
    }
    case 'pass': {
      if ((s.phase !== 'order1' && s.phase !== 'order2') || a.by !== s.turn) return s;
      if (s.phase === 'order2' && a.by === s.dealer) return s; // stick the dealer
      const log = `${seatName(s.seats, a.by)} ${a.by === HUMAN ? 'pass' : 'passes'}.`;
      if (s.phase === 'order1' && a.by === s.dealer)
        return {
          ...s,
          phase: 'order2',
          turn: (a.by + 1) % 4,
          log: `${log} The ${SUIT_SYMBOL[s.upcard.suit]} is turned down — name another suit.`,
        };
      return { ...s, turn: (a.by + 1) % 4, log };
    }
    case 'name':
      if (s.phase !== 'order2' || a.by !== s.turn || a.suit === s.upcard.suit) return s;
      return startPlay(s, a.by, a.suit, a.alone, 'named');
    case 'discard': {
      if (s.phase !== 'discard' || !s.hands[HUMAN]!.some((c) => c.id === a.id)) return s;
      const hands = s.hands.map((h, p) =>
        p === HUMAN
          ? sortHand(
              h.filter((c) => c.id !== a.id),
              s.trump,
            )
          : h,
      );
      return { ...s, hands, phase: 'play' };
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
      if (s.phase !== 'play' || s.trick.length !== activeCount(s)) return s;
      const w = trickWinner(s.trick, s.trump, { suitOf: suitIn(s.trump), power: powerIn(s.trump) }).by;
      const tricks = s.tricks.map((t, p) => (p === w ? t + 1 : t));
      const next = {
        ...s,
        trick: [],
        leader: w,
        tricks,
        log: `${seatName(s.seats, w)} ${w === HUMAN ? 'take' : 'takes'} the trick.`,
      };
      if (tricks.reduce((x, y) => x + y, 0) < 5) return next;
      const makers = teamOf(s.maker!);
      const made = tricks[makers]! + tricks[makers + 2]!;
      const scores: [number, number] = [...s.scores];
      let msg: string;
      if (made >= 3) {
        const pts = made === 5 ? (s.alone ? 4 : 2) : 1;
        scores[makers]! += pts;
        msg = made === 5 ? `March! The makers take all five (+${pts}).` : `The makers take ${made} tricks (+1).`;
      } else {
        scores[1 - makers]! += 2;
        msg = 'Euchred! The defenders score 2.';
      }
      return { ...next, scores, phase: Math.max(...scores) >= s.target ? 'matchOver' : 'handOver', log: msg };
    }
    case 'next':
      return s.phase === 'handOver' ? deal(s, (s.dealer + 1) % 4) : s;
  }
}

function hint(s: EuchreState): Hint | null {
  if ((s.phase === 'order1' || s.phase === 'order2') && s.turn === HUMAN) {
    const b = cpuBid({ ...s, cpu: 'hard' }, HUMAN);
    return { message: b.type === 'name' ? `Name ${SUIT_SYMBOL[b.suit]}.` : b.type === 'order' ? 'Order it up.' : 'Pass.' };
  }
  if (s.phase === 'discard') {
    const pw = (c: StandardCard) => (suitIn(s.trump)(c) === s.trump ? 100 : 0) + powerIn(s.trump)(c);
    return { cards: [s.hands[HUMAN]!.reduce((x, y) => (pw(y) < pw(x) ? y : x)).id] };
  }
  return toAct(s) === HUMAN ? { cards: [cpuMove(s, HUMAN, 'hard').id] } : null;
}

export const euchreRules: GameRules<EuchreState, EuchreAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[0] > s.scores[1] ? 'won' : 'lost'),
  auto: (s) => {
    if ((s.phase === 'order1' || s.phase === 'order2') && s.turn !== HUMAN) {
      const action = cpuBid(s, s.turn);
      return { action, delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, action.type !== 'pass') };
    }
    if (s.phase !== 'play') return null;
    if (s.trick.length === activeCount(s)) return { action: { type: 'collect' }, delayMs: 1000 };
    const p = toAct(s);
    if (p === null || p === HUMAN) return null;
    return { action: { type: 'play', by: p, id: cpuMove(s, p).id }, delayMs: 260 + tempo(personalityOf(s.seats, p), s.cpu) };
  },
  score: (s) => s.scores[0],
  summary: (s) =>
    `You & ${seatName(s.seats, 2)} ${s.scores[0]} – ${s.scores[1]} ${seatName(s.seats, 1)} & ${seatName(s.seats, 3)}`,
};
