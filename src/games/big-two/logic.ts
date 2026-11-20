import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;

const SUIT_ORDER: Suit[] = ['diamonds', 'clubs', 'hearts', 'spades'];
/** 3 lowest … A, then 2 highest. */
export const rankIdx = (c: StandardCard) => (c.rank + 10) % 13;
export const cardValue = (c: StandardCard) => rankIdx(c) * 4 + SUIT_ORDER.indexOf(c.suit);

export type FiveKind = 'straight' | 'flush' | 'full-house' | 'four' | 'straight-flush';
const FIVE_ORDER: FiveKind[] = ['straight', 'flush', 'full-house', 'four', 'straight-flush'];
export const FIVE_NAME: Record<FiveKind, string> = {
  straight: 'straight',
  flush: 'flush',
  'full-house': 'full house',
  four: 'four of a kind',
  'straight-flush': 'straight flush',
};

export interface Combo {
  size: number;
  /** Category for five-card hands (0 for smaller sets). */
  cat: number;
  key: number;
  name: string;
}

/** Classifies a play, or null if it is not a legal combination. */
export function comboOf(cards: readonly StandardCard[]): Combo | null {
  const n = cards.length;
  const vals = cards.map(cardValue).toSorted((a, b) => a - b);
  const top = vals.at(-1)!;
  if (n >= 1 && n <= 3) {
    if (!cards.every((c) => c.rank === cards[0]!.rank)) return null;
    return { size: n, cat: 0, key: top, name: ['single', 'pair', 'triple'][n - 1]! };
  }
  if (n !== 5) return null;
  const idx = cards.map(rankIdx).toSorted((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const i of idx) counts.set(i, (counts.get(i) ?? 0) + 1);
  const groups = [...counts].toSorted((a, b) => b[1] - a[1]);
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  // Straights run 3…A; a 2 never sits inside one.
  const span = idx[4]! - idx[0]!;
  const straight = counts.size === 5 && span === 4 && idx[4]! <= 11;
  let kind: FiveKind | null = null,
    key = top;
  if (straight && flush) kind = 'straight-flush';
  else if (groups[0]![1] === 4) [kind, key] = ['four', groups[0]![0]];
  else if (groups[0]![1] === 3 && groups[1]![1] === 2) [kind, key] = ['full-house', groups[0]![0]];
  else if (flush) kind = 'flush';
  else if (straight) kind = 'straight';
  if (!kind) return null;
  return { size: 5, cat: FIVE_ORDER.indexOf(kind) + 1, key, name: FIVE_NAME[kind] };
}

export const beats = (a: Combo, b: Combo) => a.size === b.size && (a.cat > b.cat || (a.cat === b.cat && a.key > b.key));

export interface BigTwoState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  table: { cards: StandardCard[]; combo: Combo; by: number } | null;
  turn: number;
  /** Consecutive passes since the last play. */
  passes: number;
  /** Is this the very first play of the game (it must include the 3♦)? */
  opening: boolean;
  played: StandardCard[];
  winner: number | null;
  cpu: CpuLevel;
  log: string;
}

export type BigTwoAction = { type: 'play'; by: number; ids: CardId[] } | { type: 'pass'; by: number };

const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => cardValue(a) - cardValue(b));
const isThreeDiamonds = (c: StandardCard) => c.rank === 3 && c.suit === 'diamonds';

export function setup(rng: Rng, options: RuleOptions = {}): BigTwoState {
  const deck = shuffle(createStandardDeck(), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) =>
    sortHand(deck.slice(p * 13, p * 13 + 13)).map((c) => ({ ...c, faceUp: p === HUMAN })),
  );
  const first = hands.findIndex((h) => h.some(isThreeDiamonds));
  const seats = drawSeats(rng, PLAYERS - 1);
  return {
    seats,
    hands,
    table: null,
    turn: first,
    passes: 0,
    opening: true,
    played: [],
    winner: null,
    cpu: readLevel(options),
    log: `${seatName(seats, first)} ${first === HUMAN ? 'hold' : 'holds'} the 3♦ and ${first === HUMAN ? 'lead' : 'leads'}.`,
  };
}

export function canPlay(s: BigTwoState, p: number, cards: readonly StandardCard[]): boolean {
  if (s.turn !== p || s.winner !== null || !cards.length) return false;
  const combo = comboOf(cards);
  if (!combo) return false;
  if (s.opening && !cards.some(isThreeDiamonds)) return false;
  return !s.table || beats(combo, s.table.combo);
}

function reduce(s: BigTwoState, a: BigTwoAction): BigTwoState {
  if (a.by !== s.turn || s.winner !== null) return s;
  const who = seatName(s.seats, a.by);
  if (a.type === 'pass') {
    if (!s.table) return s;
    const passes = s.passes + 1;
    const next = (a.by + 1) % PLAYERS;
    // Everyone else passed: the trick is cleared and the last player leads anything.
    if (passes >= PLAYERS - 1)
      return {
        ...s,
        table: null,
        passes: 0,
        turn: s.table.by,
        log: `${who} ${a.by === HUMAN ? 'pass' : 'passes'}. ${seatName(s.seats, s.table.by)} ${s.table.by === HUMAN ? 'lead' : 'leads'} again.`,
      };
    return { ...s, passes, turn: next, log: `${who} ${a.by === HUMAN ? 'pass' : 'passes'}.` };
  }
  const cards = s.hands[a.by]!.filter((c) => a.ids.includes(c.id));
  if (cards.length !== a.ids.length || !canPlay(s, a.by, cards)) return s;
  const combo = comboOf(cards)!;
  const hand = s.hands[a.by]!.filter((c) => !a.ids.includes(c.id));
  const shown = cards.map((c) => ({ ...c, faceUp: true }));
  const base = {
    ...s,
    hands: s.hands.map((h, p) => (p === a.by ? hand : h)),
    table: { cards: shown, combo, by: a.by },
    passes: 0,
    opening: false,
    played: [...s.played, ...shown],
    log: `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${combo.size > 1 ? `a ${combo.name}: ` : ''}${cards.map(cardLabel).join(' ')}.`,
  };
  if (!hand.length) return { ...base, winner: a.by, log: `${base.log} ${who} ${a.by === HUMAN ? 'are' : 'is'} out!` };
  return { ...base, turn: (a.by + 1) % PLAYERS };
}

/** Every legal combination in a hand (singles, pairs, triples and five-card hands). */
export function allCombos(hand: readonly StandardCard[]): StandardCard[][] {
  const out: StandardCard[][] = hand.map((c) => [c]);
  const n = hand.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (hand[i]!.rank !== hand[j]!.rank) continue;
      out.push([hand[i]!, hand[j]!]);
      for (let k = j + 1; k < n; k++) if (hand[k]!.rank === hand[i]!.rank) out.push([hand[i]!, hand[j]!, hand[k]!]);
    }
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const five = [hand[a]!, hand[b]!, hand[c]!, hand[d]!, hand[e]!];
            if (comboOf(five)) out.push(five);
          }
  return out;
}

const keyOf = (cs: StandardCard[]) => comboOf(cs)!;

export function cpuMove(s: BigTwoState, p: number, level: CpuLevel = s.cpu): BigTwoAction {
  const hand = s.hands[p]!;
  const legal = allCombos(hand).filter((cs) => canPlay(s, p, cs));
  if (!legal.length) return { type: 'pass', by: p };
  const play = (cs: StandardCard[]) => ({ type: 'play' as const, by: p, ids: cs.map((c) => c.id) });
  if (level === 'easy') return play(legal[pick(`${p}${hand.length}${s.played.length}`, legal.length)]!);
  const danger = Math.min(...s.hands.map((h, q) => (q === p ? 99 : h.length)));
  if (!s.table) {
    // Lead: shed as many low cards as possible.
    const score = (cs: StandardCard[]) => cs.length * 10 - keyOf(cs).key * 0.5 - (cs.some((c) => c.rank === 2) ? 15 : 0);
    return play(legal.reduce((a, b) => (score(b) > score(a) ? b : a)));
  }
  const cheapest = legal.reduce((a, b) => (keyOf(b).cat * 100 + keyOf(b).key < keyOf(a).cat * 100 + keyOf(a).key ? b : a));
  // Keep 2s and big hands for later unless someone is about to go out.
  const expensive = cheapest.some((c) => c.rank === 2) || keyOf(cheapest).cat >= 4;
  const holdBack = expensive && hand.length > 4 && danger > 3 && TRAITS[personalityOf(s.seats, p)].risk < 0.7;
  return holdBack && level === 'hard' ? { type: 'pass', by: p } : play(cheapest);
}

export const bigTwoRules: GameRules<BigTwoState, BigTwoAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.turn !== HUMAN || s.winner !== null) return null;
    const a = cpuMove(s, HUMAN, 'normal');
    return a.type === 'play' ? { cards: a.ids } : { message: 'Nothing beats it — pass.' };
  },
  status: (s) => (s.winner === null ? 'playing' : s.winner === HUMAN ? 'won' : 'lost'),
  auto: (s) => {
    if (s.winner !== null || s.turn === HUMAN) return null;
    const action = cpuMove(s, s.turn);
    return {
      action,
      delayMs:
        300 +
        tempo(personalityOf(s.seats, s.turn), s.cpu, action.type === 'pass' && s.hands[s.turn]!.length < 4, `${s.played.length}`),
    };
  },
  score: (s) => s.hands[HUMAN]!.length,
  summary: (s) =>
    s.winner === HUMAN
      ? 'You went out first!'
      : `${seatName(s.seats, s.winner ?? 1)} went out first. You had ${s.hands[HUMAN]!.length} cards left.`,
};
