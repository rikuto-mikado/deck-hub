import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, rankLabel, type CardId, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;

/** 3 lowest … A highest; 2 (reset) and 10 (burn) are played on anything. */
export const power = (c: StandardCard) => (c.rank === 1 ? 14 : c.rank);
const isWild = (c: StandardCard) => c.rank === 2 || c.rank === 10;

export interface PalaceState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  up: StandardCard[][];
  down: StandardCard[][];
  stock: StandardCard[];
  pile: StandardCard[];
  burned: number;
  phase: 'swap' | 'play';
  turn: number;
  out: number[];
  cpu: CpuLevel;
  log: string;
}

export type PalaceAction =
  | { type: 'swap'; hand: CardId; up: CardId }
  | { type: 'ready' }
  | { type: 'play'; by: number; ids: CardId[] }
  | { type: 'blind'; by: number; index: number }
  | { type: 'pickup'; by: number };

const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => (isWild(a) ? 20 : power(a)) - (isWild(b) ? 20 : power(b)));
const name = (s: PalaceState, p: number) => seatName(s.seats, p);
/** CPU keeps its best cards for the end: power cards and high ranks go face up. */
const strength = (c: StandardCard) => (isWild(c) ? 30 : power(c));

export function setup(rng: Rng, options: RuleOptions = {}): PalaceState {
  const deck = shuffle(createStandardDeck(), rng);
  const down = Array.from({ length: PLAYERS }, () => deck.splice(-3));
  const nine = Array.from({ length: PLAYERS }, () => deck.splice(-6).map((c) => ({ ...c, faceUp: true })));
  const up: StandardCard[][] = [],
    hands: StandardCard[][] = [];
  nine.forEach((cards, p) => {
    const sorted = cards.toSorted((a, b) => strength(b) - strength(a));
    up.push(p === HUMAN ? cards.slice(0, 3) : sorted.slice(0, 3));
    const hand = p === HUMAN ? cards.slice(3) : sorted.slice(3);
    hands.push(p === HUMAN ? sortHand(hand) : hand.map((c) => ({ ...c, faceUp: false })));
  });
  return {
    seats: drawSeats(rng, PLAYERS - 1),
    hands,
    up,
    down,
    stock: deck,
    pile: [],
    burned: 0,
    phase: 'swap',
    turn: HUMAN,
    out: [],
    cpu: readLevel(options),
    log: 'Swap cards between your hand and your face-up palace, then press Ready.',
  };
}

/** The card that must be beaten, looking through 2s (which reset the pile). */
const effectiveTop = (pile: readonly StandardCard[]) => pile.at(-1);

export function canPlayOn(pile: readonly StandardCard[], card: StandardCard): boolean {
  if (isWild(card)) return true;
  const top = effectiveTop(pile);
  if (!top || top.rank === 2) return true;
  if (top.rank === 7) return power(card) <= 7;
  return power(card) >= power(top);
}

/** Where the player plays from: hand first, then the face-up palace, then blind cards. */
export function source(s: PalaceState, p: number): 'hand' | 'up' | 'down' | null {
  if (s.hands[p]!.length) return 'hand';
  if (s.stock.length) return 'hand';
  if (s.up[p]!.length) return 'up';
  if (s.down[p]!.length) return 'down';
  return null;
}

const finished = (s: PalaceState, p: number) => !s.hands[p]!.length && !s.up[p]!.length && !s.down[p]!.length && !s.stock.length;

function nextTurn(s: PalaceState, from: number): number {
  for (let k = 1; k <= PLAYERS; k++) {
    const q = (from + k) % PLAYERS;
    if (!s.out.includes(q)) return q;
  }
  return from;
}

/** After a play: draw back to three, burn on a 10 or four of a kind, record a finish, pass the turn. */
function afterPlay(s: PalaceState, p: number, log: string): PalaceState {
  let next = s;
  const hand = next.hands[p]!.slice();
  let stock = next.stock;
  while (hand.length < 3 && stock.length) {
    hand.push({ ...stock.at(-1)!, faceUp: p === HUMAN });
    stock = stock.slice(0, -1);
  }
  next = { ...next, stock, hands: next.hands.map((h, q) => (q === p ? (p === HUMAN ? sortHand(hand) : hand) : h)) };
  const top = next.pile.at(-1)!;
  const four = next.pile.length >= 4 && next.pile.slice(-4).every((c) => c.rank === top.rank);
  const burn = top.rank === 10 || four;
  if (burn) {
    next = { ...next, burned: next.burned + next.pile.length, pile: [] };
    log += four && top.rank !== 10 ? ' Four of a kind — the pile burns!' : ' The pile burns!';
  }
  if (finished(next, p)) {
    next = { ...next, out: [...next.out, p] };
    log += ` ${name(s, p)} ${p === HUMAN ? 'are' : 'is'} out!`;
    return { ...next, turn: nextTurn(next, p), log };
  }
  // Burning the pile earns another turn.
  return { ...next, turn: burn ? p : nextTurn(next, p), log };
}

function reduce(s: PalaceState, a: PalaceAction): PalaceState {
  if (a.type === 'swap') {
    if (s.phase !== 'swap') return s;
    const h = s.hands[HUMAN]!.find((c) => c.id === a.hand);
    const u = s.up[HUMAN]!.find((c) => c.id === a.up);
    if (!h || !u) return s;
    return {
      ...s,
      hands: s.hands.map((x, p) => (p === HUMAN ? sortHand([...x.filter((c) => c.id !== a.hand), u]) : x)),
      up: s.up.map((x, p) => (p === HUMAN ? x.map((c) => (c.id === a.up ? h : c)) : x)),
    };
  }
  if (a.type === 'ready')
    return s.phase === 'swap'
      ? { ...s, phase: 'play', log: 'Play equal or higher. 2 resets, 10 burns, 7 means seven or lower next.' }
      : s;
  if (s.phase !== 'play' || a.by !== s.turn || s.out.includes(a.by)) return s;
  const who = name(s, a.by);
  const src = source(s, a.by);
  switch (a.type) {
    case 'play': {
      if (src !== 'hand' && src !== 'up') return s;
      const from = src === 'hand' ? s.hands[a.by]! : s.up[a.by]!;
      const cards = from.filter((c) => a.ids.includes(c.id));
      if (
        !cards.length ||
        cards.length !== a.ids.length ||
        !cards.every((c) => c.rank === cards[0]!.rank) ||
        !canPlayOn(s.pile, cards[0]!)
      )
        return s;
      const rest = from.filter((c) => !a.ids.includes(c.id));
      const next = {
        ...s,
        hands: src === 'hand' ? s.hands.map((h, p) => (p === a.by ? rest : h)) : s.hands,
        up: src === 'up' ? s.up.map((h, p) => (p === a.by ? rest : h)) : s.up,
        pile: [...s.pile, ...cards.map((c) => ({ ...c, faceUp: true }))],
      };
      return afterPlay(
        next,
        a.by,
        `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cards.length > 1 ? `${cards.length} × ${rankLabel(cards[0]!.rank)}` : cardLabel(cards[0]!)}.`,
      );
    }
    case 'blind': {
      if (src !== 'down') return s;
      const card = s.down[a.by]![a.index];
      if (!card) return s;
      const shown = { ...card, faceUp: true };
      const down = s.down.map((d, p) => (p === a.by ? d.filter((_, i) => i !== a.index) : d));
      if (canPlayOn(s.pile, shown))
        return afterPlay(
          { ...s, down, pile: [...s.pile, shown] },
          a.by,
          `${who} ${a.by === HUMAN ? 'flip' : 'flips'} ${cardLabel(card)} — it plays!`,
        );
      const taken = [...s.pile, shown].map((c) => ({ ...c, faceUp: a.by === HUMAN }));
      return {
        ...s,
        down,
        pile: [],
        hands: s.hands.map((h, p) => (p === a.by ? (p === HUMAN ? sortHand([...h, ...taken]) : [...h, ...taken]) : h)),
        turn: nextTurn(s, a.by),
        log: `${who} ${a.by === HUMAN ? 'flip' : 'flips'} ${cardLabel(card)} — no good, ${a.by === HUMAN ? 'you pick' : 'picks'} up the pile.`,
      };
    }
    case 'pickup': {
      if (!s.pile.length || src === 'down') return s;
      const taken = s.pile.map((c) => ({ ...c, faceUp: a.by === HUMAN }));
      return {
        ...s,
        pile: [],
        hands: s.hands.map((h, p) => (p === a.by ? (p === HUMAN ? sortHand([...h, ...taken]) : [...h, ...taken]) : h)),
        turn: nextTurn(s, a.by),
        log: `${who} ${a.by === HUMAN ? 'pick' : 'picks'} up ${taken.length} cards.`,
      };
    }
  }
}

/** Ranks a player could play right now (from hand or the face-up palace). */
export function playableCards(s: PalaceState, p: number): StandardCard[] {
  const src = source(s, p);
  if (src !== 'hand' && src !== 'up') return [];
  return (src === 'hand' ? s.hands[p]! : s.up[p]!).filter((c) => canPlayOn(s.pile, c));
}

export function cpuMove(s: PalaceState, p: number, level: CpuLevel = s.cpu): PalaceAction {
  const src = source(s, p);
  if (src === 'down') return { type: 'blind', by: p, index: 0 };
  const options = playableCards(s, p);
  if (!options.length) return { type: 'pickup', by: p };
  const traits = TRAITS[personalityOf(s.seats, p)];
  const plain = options.filter((c) => !isWild(c));
  let rank: number;
  if (plain.length) rank = plain.reduce((a, b) => (power(b) < power(a) ? b : a)).rank;
  else {
    // Only 2s and 10s: burn a big pile with a 10, otherwise reset with a 2.
    const ten = options.find((c) => c.rank === 10);
    const two = options.find((c) => c.rank === 2);
    rank = ten && (s.pile.length >= 5 || traits.risk > 0.6 || !two) ? 10 : two ? 2 : options[0]!.rank;
  }
  // A cautious hard player keeps a lone Ace or King if the stock still has cards.
  const from = src === 'hand' ? s.hands[p]! : s.up[p]!;
  const ids = from.filter((c) => c.rank === rank).map((c) => c.id);
  return { type: 'play', by: p, ids: level === 'easy' ? ids.slice(0, 1) : ids };
}

export const palaceRules: GameRules<PalaceState, PalaceAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.phase === 'swap') return { message: 'Put your 2s, 10s and high cards face up; keep low cards in hand.' };
    if (s.turn !== HUMAN) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type === 'play') return { cards: a.ids };
    return { message: a.type === 'pickup' ? 'Nothing plays — pick up the pile.' : 'Flip one of your blind cards.' };
  },
  status: (s) => (s.out.includes(HUMAN) ? 'won' : s.out.length >= PLAYERS - 1 ? 'lost' : 'playing'),
  auto: (s) => {
    if (s.phase !== 'play' || s.turn === HUMAN || s.out.includes(s.turn)) return null;
    const action = cpuMove(s, s.turn);
    return {
      action,
      delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, action.type === 'pickup', `${s.pile.length}${s.burned}`),
    };
  },
  score: (s) => s.hands[HUMAN]!.length + s.up[HUMAN]!.length + s.down[HUMAN]!.length,
  summary: (s) =>
    s.out.includes(HUMAN)
      ? `You escaped the palace (${['1st', '2nd', '3rd'][s.out.indexOf(HUMAN)]} out).`
      : 'You were left holding cards — the palace keeper!',
};
