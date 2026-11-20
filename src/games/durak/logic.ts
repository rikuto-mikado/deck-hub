import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh } from '@/core/rules/trickTaking';
import { SUITS, SUIT_SYMBOL, cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const HAND = 6;

export interface Pair {
  attack: StandardCard;
  defense: StandardCard | null;
}

export interface DurakState {
  seats: CpuSeat[];
  players: number;
  hands: StandardCard[][];
  /** Draw pile; index 0 is the face-up trump card at the bottom. */
  stock: StandardCard[];
  trump: Suit;
  trumpCard: StandardCard;
  discard: number;
  attacker: number;
  defender: number;
  table: Pair[];
  phase: 'attack' | 'defend';
  /** Seats that may throw in this bout, in order; `thrower` indexes it. */
  throwers: number[];
  thrower: number;
  /** Consecutive passes by throwers since the last card. */
  passes: number;
  limit: number;
  /** Seats out of cards (safe), in the order they got out. */
  out: number[];
  cpu: CpuLevel;
  log: string;
}

export type DurakAction =
  | { type: 'attack'; by: number; id: CardId }
  | { type: 'pass'; by: number }
  | { type: 'defend'; by: number; id: CardId }
  | { type: 'take'; by: number };

const sortHand = (h: StandardCard[], trump: Suit) =>
  h.toSorted(
    (a, b) =>
      (a.suit === trump ? 1 : 0) - (b.suit === trump ? 1 : 0) ||
      SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) ||
      aceHigh(a) - aceHigh(b),
  );
const name = (s: DurakState, p: number) => seatName(s.seats, p);
const hasCards = (s: DurakState, p: number) => s.hands[p]!.length > 0 || (s.stock.length > 0 && !s.out.includes(p));
const active = (s: DurakState) => Array.from({ length: s.players }, (_, p) => p).filter((p) => hasCards(s, p));

function nextActive(s: DurakState, from: number): number {
  for (let k = 1; k <= s.players; k++) {
    const q = (from + k) % s.players;
    if (hasCards(s, q)) return q;
  }
  return from;
}

/** Defending card beats attacking card: same suit and higher, or a trump on a non-trump. */
export const beats = (attack: StandardCard, card: StandardCard, trump: Suit) =>
  (card.suit === attack.suit && aceHigh(card) > aceHigh(attack)) || (card.suit === trump && attack.suit !== trump);

function startBout(s: DurakState, attacker: number): DurakState {
  const defender = nextActive(s, attacker);
  const others = [];
  for (let k = 0; k < s.players; k++) {
    const q = (attacker + k) % s.players;
    if (q !== defender && hasCards(s, q)) others.push(q);
  }
  return {
    ...s,
    attacker,
    defender,
    table: [],
    phase: 'attack',
    throwers: others,
    thrower: 0,
    passes: 0,
    limit: Math.min(6, s.hands[defender]!.length),
    log: `${name(s, attacker)} ${attacker === HUMAN ? 'attack' : 'attacks'} ${defender === HUMAN ? 'you' : name(s, defender)}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): DurakState {
  const players = Math.min(4, Math.max(2, Number(options.players ?? '3') || 3));
  const full = options.deck === '52';
  const deck = shuffle(
    createStandardDeck().filter((c) => full || c.rank === 1 || c.rank >= 6),
    rng,
  );
  const hands = Array.from({ length: players }, () => deck.splice(-HAND));
  const trumpCard = { ...deck[0]!, faceUp: true };
  deck[0] = trumpCard;
  const trump = trumpCard.suit;
  // The lowest trump attacks first.
  let first = 0,
    low = 99;
  hands.forEach((h, p) => h.forEach((c) => c.suit === trump && aceHigh(c) < low && ([first, low] = [p, aceHigh(c)])));
  const base: DurakState = {
    seats: drawSeats(rng, players - 1),
    players,
    hands: hands.map((h, p) => (p === HUMAN ? sortHand(h, trump).map((c) => ({ ...c, faceUp: true })) : h)),
    stock: deck,
    trump,
    trumpCard,
    discard: 0,
    attacker: first,
    defender: 0,
    table: [],
    phase: 'attack',
    throwers: [],
    thrower: 0,
    passes: 0,
    limit: HAND,
    out: [],
    cpu: readLevel(options),
    log: '',
  };
  const s = startBout(base, first);
  return { ...s, log: `${SUIT_SYMBOL[trump]} is trump. ${s.log}` };
}

export const actor = (s: DurakState): number | null =>
  over(s) ? null : s.phase === 'defend' ? s.defender : (s.throwers[s.thrower] ?? null);

const tableRanks = (s: DurakState) => new Set(s.table.flatMap((p) => [p.attack.rank, ...(p.defense ? [p.defense.rank] : [])]));
export const canAttack = (s: DurakState, card: StandardCard) =>
  s.table.length < s.limit &&
  s.hands[s.defender]!.length > s.table.filter((p) => !p.defense).length &&
  (!s.table.length || tableRanks(s).has(card.rank));

/** Refills hands to six (attackers first, defender last), records who is out, and starts the next bout. */
function endBout(s: DurakState, nextAttacker: number, discard: number, log: string): DurakState {
  const hands = s.hands.map((h) => h.slice());
  let stock = s.stock.slice();
  for (const p of [...s.throwers, s.defender]) {
    while (hands[p]!.length < HAND && stock.length) hands[p]!.push({ ...stock.pop()!, faceUp: p === HUMAN });
    if (p === HUMAN) hands[p] = sortHand(hands[p]!, s.trump);
  }
  let next: DurakState = { ...s, hands, stock, discard: s.discard + discard, table: [], log };
  const out = [...next.out];
  for (let p = 0; p < s.players; p++) if (!next.hands[p]!.length && !stock.length && !out.includes(p)) out.push(p);
  next = { ...next, out };
  if (over(next)) return next;
  const attacker = hasCards(next, nextAttacker) ? nextAttacker : nextActive(next, nextAttacker);
  const bout = startBout(next, attacker);
  return { ...bout, log: `${log} ${bout.log}` };
}

function reduce(s: DurakState, a: DurakAction): DurakState {
  if (actor(s) !== a.by) return s;
  const who = name(s, a.by);
  switch (a.type) {
    case 'attack': {
      if (s.phase !== 'attack') return s;
      const card = s.hands[a.by]!.find((c) => c.id === a.id);
      if (!card || !canAttack(s, card)) return s;
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        table: [...s.table, { attack: { ...card, faceUp: true }, defense: null }],
        phase: 'defend',
        passes: 0,
        log: `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)}.`,
      };
    }
    case 'pass': {
      if (s.phase !== 'attack' || !s.table.length) return s;
      const passes = s.passes + 1;
      // Every thrower has passed: the defence holds and the defender attacks next.
      if (passes >= s.throwers.length)
        return endBout(
          s,
          s.defender,
          s.table.length * 2,
          `${s.defender === HUMAN ? 'You beat' : `${name(s, s.defender)} beats`} off the attack!`,
        );
      return { ...s, passes, thrower: (s.thrower + 1) % s.throwers.length, log: `${who} ${a.by === HUMAN ? 'pass' : 'passes'}.` };
    }
    case 'defend': {
      if (s.phase !== 'defend') return s;
      const open = s.table.findIndex((p) => !p.defense);
      const card = s.hands[a.by]!.find((c) => c.id === a.id);
      if (open < 0 || !card || !beats(s.table[open]!.attack, card, s.trump)) return s;
      const done = s.table.length >= s.limit || !s.hands[a.by]!.filter((c) => c.id !== a.id).length;
      const next: DurakState = {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        table: s.table.map((p, i) => (i === open ? { ...p, defense: { ...card, faceUp: true } } : p)),
        phase: 'attack',
        thrower: 0,
        passes: 0,
        log: `${who} ${a.by === HUMAN ? 'beat' : 'beats'} it with ${cardLabel(card)}.`,
      };
      return done ? endBout(next, s.defender, next.table.length * 2, `${next.log} The attack is over.`) : next;
    }
    case 'take': {
      if (s.phase !== 'defend') return s;
      const cards = s.table
        .flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])])
        .map((c) => ({ ...c, faceUp: a.by === HUMAN }));
      const hands = s.hands.map((h, p) => (p === a.by ? [...h, ...cards] : h));
      return endBout(
        { ...s, hands },
        nextActive({ ...s, hands }, s.defender),
        0,
        `${who} ${a.by === HUMAN ? 'pick' : 'picks'} up ${cards.length} cards.`,
      );
    }
  }
}

function over(s: DurakState): boolean {
  return active(s).length <= 1;
}

const value = (c: StandardCard, trump: Suit) => aceHigh(c) + (c.suit === trump ? 20 : 0);

export function cpuMove(s: DurakState, p: number, level: CpuLevel = s.cpu): DurakAction {
  const hand = s.hands[p]!;
  const cheapest = (cs: StandardCard[]) => cs.reduce((a, b) => (value(b, s.trump) < value(a, s.trump) ? b : a));
  const traits = TRAITS[personalityOf(s.seats, p)];
  if (s.phase === 'defend') {
    const open = s.table.find((x) => !x.defense)!;
    const options = hand.filter((c) => beats(open.attack, c, s.trump));
    if (!options.length) return { type: 'take', by: p };
    if (level === 'easy') return { type: 'defend', by: p, id: options[pick(`${p}${hand.length}`, options.length)]!.id };
    const best = cheapest(options);
    // Early on, a cautious player would rather take a couple of low cards than spend a big trump.
    const costly = best.suit === s.trump && aceHigh(best) >= 12 && s.stock.length > 8 && s.table.length <= 2;
    return costly && traits.risk < 0.5 ? { type: 'take', by: p } : { type: 'defend', by: p, id: best.id };
  }
  const options = hand.filter((c) => canAttack(s, c));
  if (!options.length) return { type: 'pass', by: p };
  if (!s.table.length) return { type: 'attack', by: p, id: (level === 'easy' ? options[0]! : cheapest(options)).id };
  const plain = options.filter((c) => c.suit !== s.trump);
  // Throw in cheap matching cards; ambitious players pile on even with trumps when the stock is gone.
  const pool = plain.length ? plain : !s.stock.length && traits.risk > 0.6 ? options : [];
  if (!pool.length) return { type: 'pass', by: p };
  const card = cheapest(pool);
  if (aceHigh(card) >= 13 && s.stock.length > 6 && level !== 'easy') return { type: 'pass', by: p };
  return { type: 'attack', by: p, id: card.id };
}

export const durakRules: GameRules<DurakState, DurakAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (actor(s) !== HUMAN) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type === 'attack' || a.type === 'defend') return { cards: [a.id] };
    return { message: a.type === 'take' ? 'You cannot beat it — take the cards.' : 'Nothing worth throwing in — pass.' };
  },
  status: (s) => {
    if (!hasCards(s, HUMAN)) return 'won';
    return over(s) ? 'lost' : 'playing';
  },
  auto: (s) => {
    const p = actor(s);
    if (p === null || p === HUMAN) return null;
    const action = cpuMove(s, p);
    return {
      action,
      delayMs: 300 + tempo(personalityOf(s.seats, p), s.cpu, action.type === 'take', `${s.discard}${s.table.length}`),
    };
  },
  score: (s) => s.hands[HUMAN]!.length,
  summary: (s) =>
    hasCards(s, HUMAN) ? 'You are the Durak — the last one holding cards.' : 'You got rid of your cards. Not the fool this time!',
};
