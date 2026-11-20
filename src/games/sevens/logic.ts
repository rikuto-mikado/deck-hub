import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';
import { drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
export const MAX_PASSES = 3;

export interface SevensState {
  /** Named opponents with hidden personalities (seats 1–3). */
  seats: CpuSeat[];
  hands: StandardCard[][];
  /** Cards on the table, by suit, indexed by rank (1…13). */
  board: Record<Suit, (StandardCard | null)[]>;
  turn: number;
  passes: number[];
  /** Finish order. Busted players are appended to `busted` instead. */
  finished: number[];
  busted: number[];
  log: string;
  cpu: CpuLevel;
}

export type SevensAction = { type: 'play'; by: number; id: CardId } | { type: 'pass'; by: number };

const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);

export function isPlayable(s: SevensState, c: StandardCard): boolean {
  const row = s.board[c.suit];
  return !row[c.rank] && (!!row[c.rank - 1] || !!row[c.rank + 1]);
}

const isOut = (s: SevensState, p: number) => s.finished.includes(p) || s.busted.includes(p);
const nm = (s: Pick<SevensState, 'seats'>, p: number) => seatName(s.seats, p);

function nextTurn(s: SevensState, from: number): number {
  for (let k = 1; k <= PLAYERS; k++) {
    const q = (from + k) % PLAYERS;
    if (!isOut(s, q)) return q;
  }
  return from;
}

export function setup(rng: Rng, options: RuleOptions = {}): SevensState {
  const deck = shuffle(createStandardDeck(), rng).map((c) => ({ ...c, faceUp: true }));
  const hands: StandardCard[][] = Array.from({ length: PLAYERS }, () => []);
  deck.forEach((c, i) => hands[i % PLAYERS]!.push(c));
  const board = Object.fromEntries(SUITS.map((s) => [s, Array<StandardCard | null>(14).fill(null)])) as SevensState['board'];
  let first = 0;
  hands.forEach((h, p) => {
    for (const c of h.filter((x) => x.rank === 7)) {
      board[c.suit][7] = c;
      if (c.suit === 'diamonds') first = p;
    }
  });
  const seats = drawSeats(rng, PLAYERS - 1);
  return {
    seats,
    hands: hands.map((h, p) => {
      const rest = h.filter((c) => c.rank !== 7);
      return p === HUMAN ? sortHand(rest) : rest.map((c) => ({ ...c, faceUp: false }));
    }),
    board,
    turn: first,
    passes: [0, 0, 0, 0],
    finished: [],
    busted: [],
    cpu: readLevel(options),
    log: `All sevens are out. ${seatName(seats, first)} ${first === HUMAN ? 'start' : 'starts'} (♦7).`,
  };
}

function reduce(s: SevensState, a: SevensAction): SevensState {
  if (a.by !== s.turn || isOut(s, a.by)) return s;
  const hands = s.hands.map((h) => h.slice());
  if (a.type === 'play') {
    const card = hands[a.by]!.find((c) => c.id === a.id);
    if (!card || !isPlayable(s, card)) return s;
    hands[a.by] = hands[a.by]!.filter((c) => c.id !== a.id);
    const board = {
      ...s.board,
      [card.suit]: s.board[card.suit].map((c, r) => (r === card.rank ? { ...card, faceUp: true } : c)),
    };
    const finished = hands[a.by]!.length ? s.finished : [...s.finished, a.by];
    const next = {
      ...s,
      hands,
      board,
      finished,
      log: `${nm(s, a.by)} played ${card.rank === 1 ? 'A' : card.rank > 10 ? 'JQK'[card.rank - 11] : card.rank}${'♠♥♦♣'[SUITS.indexOf(card.suit)]}.`,
    };
    return { ...next, turn: nextTurn(next, a.by) };
  }
  if (s.passes[a.by]! >= MAX_PASSES) {
    // A fourth pass busts you: your cards go onto the table where they belong.
    const board = { ...s.board };
    for (const c of hands[a.by]!) board[c.suit] = board[c.suit].map((x, r) => (r === c.rank ? { ...c, faceUp: true } : x));
    hands[a.by] = [];
    const next = {
      ...s,
      hands,
      board,
      busted: [...s.busted, a.by],
      log: `${nm(s, a.by)} passed too often and ${a.by === HUMAN ? 'are' : 'is'} out!`,
    };
    return { ...next, turn: nextTurn(next, a.by) };
  }
  const passes = s.passes.map((n, i) => (i === a.by ? n + 1 : n));
  const next = { ...s, passes, log: `${nm(s, a.by)} passed (${passes[a.by]}/${MAX_PASSES}).` };
  return { ...next, turn: nextTurn(next, a.by) };
}

/**
 * Easy plays any legal card. Normal prefers cards that open a path to more of its own cards.
 * Hard thinks about what each card gives away: it chains through cards it holds next, plays
 * dead ends (A, K) freely, and avoids opening a suit that only helps the other players.
 */
export function cpuMove(s: SevensState, p: number, level: CpuLevel = s.cpu): SevensAction {
  const hand = s.hands[p]!;
  const legal = hand.filter((c) => isPlayable(s, c));
  if (!legal.length) return { type: 'pass', by: p };
  if (level === 'easy') return { type: 'play', by: p, id: legal[pick(hand.map((c) => c.id).join(), legal.length)]!.id };
  const holds = (suit: Suit, rank: number) => hand.some((h) => h.suit === suit && h.rank === rank);
  const value = (c: StandardCard) => {
    const dir = c.rank < 7 ? -1 : 1;
    let own = 0,
      others = 0;
    for (let r = c.rank + dir; r >= 1 && r <= 13; r += dir) {
      if (holds(c.suit, r)) own++;
      else if (!s.board[c.suit][r]) others++;
    }
    if (level === 'normal') return own * 10 + Math.abs(c.rank - 7);
    const next = c.rank + dir;
    let v = own * 10 - others * 4;
    if (next >= 1 && next <= 13 && holds(c.suit, next)) v += 30; // only we can follow it
    if (next < 1 || next > 13) v += 25; // a dead end gives nothing away
    return v;
  };
  const best = legal.reduce((a, b) => (value(b) > value(a) ? b : a));
  return { type: 'play', by: p, id: best.id };
}

const outCount = (s: SevensState) => s.finished.length + s.busted.length;

/** Final places: finishers from the top, busted players from the bottom (first bust is last). */
export function placesOf(s: SevensState): number[] {
  const places = Array<number>(PLAYERS).fill(-1);
  s.finished.forEach((p, i) => (places[p] = i));
  s.busted.forEach((p, i) => (places[p] = PLAYERS - 1 - i));
  const left = s.hands.map((_, p) => p).filter((p) => !isOut(s, p));
  if (left.length === 1) places[left[0]!] = s.finished.length;
  return places;
}

const over = (s: SevensState) => outCount(s) >= PLAYERS - 1;

function hint(s: SevensState) {
  if (s.turn !== HUMAN || isOut(s, HUMAN)) return null;
  const move = cpuMove(s, HUMAN, 'normal');
  return move.type === 'play' ? { cards: [move.id] } : { message: 'No card fits — you have to pass.' };
}

export const sevensRules: GameRules<SevensState, SevensAction> = {
  setup,
  reduce,
  hint,
  // Play continues until every place is decided; first place wins.
  status: (s) => (!over(s) ? 'playing' : placesOf(s)[HUMAN] === 0 ? 'won' : 'lost'),
  auto: (s) => {
    if (over(s) || s.turn === HUMAN || isOut(s, s.turn)) return null;
    const action = cpuMove(s, s.turn);
    // Being forced to pass hurts: Easy and Normal CPUs hesitate visibly before doing it.
    const delay = tempo(personalityOf(s.seats, s.turn), s.cpu, action.type === 'pass', `${s.turn}${s.log}`);
    return { action, delayMs: 300 + delay };
  },
  summary: (s) => {
    const places = placesOf(s);
    const order = [0, 1, 2, 3].map((place) => nm(s, places.indexOf(place)));
    return `${s.busted.includes(HUMAN) ? 'You went bust. ' : ''}Final order: ${order.join(', ')}`;
  },
};
