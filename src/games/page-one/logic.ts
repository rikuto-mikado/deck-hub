import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, SUIT_SYMBOL, cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import { isOn, type GameRules, type Hint, type RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
export const HAND = 7;
export const PAGE_ONE_PENALTY = 2;

export interface PageOneState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  stock: StandardCard[];
  pile: StandardCard[];
  /** Suit to follow (an 8 can change it). */
  suit: Suit;
  dir: 1 | -1;
  turn: number;
  /** The current player already drew this turn and may now only play that card or pass. */
  drew: CardId | null;
  specials: boolean;
  winner: number | null;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type PageOneAction =
  | { type: 'play'; by: number; id: CardId; suit?: Suit; call?: boolean }
  | { type: 'draw'; by: number }
  | { type: 'pass'; by: number };

const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);
const top = (s: PageOneState) => s.pile.at(-1)!;

export function setup(rng: Rng, options: RuleOptions = {}): PageOneState {
  const deck = shuffle(createStandardDeck(), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) => deck.splice(-HAND).map((c) => ({ ...c, faceUp: p === HUMAN })));
  // The starter is never an 8 or a special card.
  const startAt = deck.findLastIndex((c) => c.rank >= 3 && c.rank <= 10 && c.rank !== 8);
  const [starter] = deck.splice(startAt, 1);
  const seed = nextSeed(rng);
  const seats = drawSeats(rng, PLAYERS - 1);
  return {
    seats,
    hands: hands.map((h, p) => (p === HUMAN ? sortHand(h) : h)),
    stock: deck,
    pile: [{ ...starter!, faceUp: true }],
    suit: starter!.suit,
    dir: 1,
    turn: HUMAN,
    drew: null,
    specials: options.specials === undefined ? true : isOn(options, 'specials'),
    winner: null,
    cpu: readLevel(options),
    seed,
    log: `The starter is ${cardLabel(starter!)}. You go first.`,
  };
}

export const canPlay = (s: PageOneState, c: StandardCard) => c.rank === 8 || c.suit === s.suit || c.rank === top(s).rank;
const next = (s: PageOneState, from: number, steps = 1) => (((from + s.dir * steps) % PLAYERS) + PLAYERS) % PLAYERS;

function drawCards(s: PageOneState, p: number, n: number): PageOneState {
  let stock = s.stock,
    pile = s.pile,
    seed = s.seed;
  const hand = s.hands[p]!.slice();
  for (let i = 0; i < n; i++) {
    if (!stock.length) {
      if (pile.length <= 1) break;
      const rng = createRng(seed);
      stock = shuffle(pile.slice(0, -1), rng).map((c) => ({ ...c, faceUp: false }));
      pile = pile.slice(-1);
      seed = nextSeed(rng);
    }
    hand.push({ ...stock.at(-1)!, faceUp: p === HUMAN });
    stock = stock.slice(0, -1);
  }
  return { ...s, stock, pile, seed, hands: s.hands.map((h, q) => (q === p ? (p === HUMAN ? sortHand(hand) : hand) : h)) };
}

function reduce(s: PageOneState, a: PageOneAction): PageOneState {
  if (s.winner !== null || a.by !== s.turn) return s;
  const who = seatName(s.seats, a.by);
  switch (a.type) {
    case 'draw': {
      if (s.drew) return s;
      const after = drawCards(s, a.by, 1);
      const got = after.hands[a.by]!.find((c) => !s.hands[a.by]!.some((x) => x.id === c.id));
      if (!got) return { ...after, turn: next(s, a.by), log: `${who} cannot draw — the deck is empty.` };
      return { ...after, drew: got.id, log: `${who} ${a.by === HUMAN ? 'draw' : 'draws'} a card.` };
    }
    case 'pass':
      return s.drew ? { ...s, drew: null, turn: next(s, a.by), log: `${who} ${a.by === HUMAN ? 'pass' : 'passes'}.` } : s;
    case 'play': {
      const card = s.hands[a.by]!.find((c) => c.id === a.id);
      if (!card || !canPlay(s, card) || (s.drew && s.drew !== a.id)) return s;
      const hand = s.hands[a.by]!.filter((c) => c.id !== a.id);
      const suit = card.rank === 8 ? (a.suit ?? card.suit) : card.suit;
      let st: PageOneState = {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? hand : h)),
        pile: [...s.pile, { ...card, faceUp: true }],
        suit,
        drew: null,
      };
      let log = `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)}${card.rank === 8 ? ` and ${a.by === HUMAN ? 'call' : 'calls'} ${SUIT_SYMBOL[suit]}` : ''}.`;
      if (!hand.length) return { ...st, winner: a.by, log: `${log} ${who} ${a.by === HUMAN ? 'are' : 'is'} out!` };
      if (hand.length === 1) {
        if (a.call) log += ' "Page One!"';
        else {
          st = drawCards(st, a.by, PAGE_ONE_PENALTY);
          log += ` Forgot to call Page One — draws ${PAGE_ONE_PENALTY}.`;
        }
      }
      let steps = 1;
      if (s.specials) {
        if (card.rank === 1) st = { ...st, dir: -st.dir as 1 | -1 };
        if (card.rank === 11) steps = 2;
        const penalty = card.rank === 2 ? 2 : card.suit === 'spades' && card.rank === 12 ? 5 : 0;
        if (penalty) {
          const victim = next(st, a.by);
          st = drawCards(st, victim, penalty);
          steps = 2;
          log += ` ${seatName(s.seats, victim)} ${victim === HUMAN ? 'draw' : 'draws'} ${penalty} and ${victim === HUMAN ? 'lose' : 'loses'} a turn.`;
        }
        if (card.rank === 11) log += ' Skip!';
        if (card.rank === 1) log += ' Reverse!';
      }
      return { ...st, turn: next(st, a.by, steps), log };
    }
  }
}

/** Most-held suit, used when calling a suit with an 8. */
const favouriteSuit = (hand: readonly StandardCard[]): Suit =>
  SUITS.reduce((a, b) =>
    hand.filter((c) => c.suit === b && c.rank !== 8).length > hand.filter((c) => c.suit === a && c.rank !== 8).length ? b : a,
  );

export function cpuMove(s: PageOneState, p: number, level: CpuLevel = s.cpu): PageOneAction {
  const hand = s.hands[p]!;
  const options = hand.filter((c) => canPlay(s, c) && (!s.drew || c.id === s.drew));
  if (!options.length) return s.drew ? { type: 'pass', by: p } : { type: 'draw', by: p };
  const traits = TRAITS[personalityOf(s.seats, p)];
  const threat = Math.min(...s.hands.map((h, q) => (q === p ? 99 : h.length)));
  const value = (c: StandardCard) => {
    let v = hand.filter((x) => x.suit === c.suit).length * 2 + c.rank * 0.1;
    if (c.rank === 8) v -= level === 'easy' ? 0 : 20; // save wild cards
    const special = s.specials && (c.rank === 2 || c.rank === 11 || (c.suit === 'spades' && c.rank === 12));
    if (special) v += threat <= 2 ? 15 : traits.risk * 6;
    return v;
  };
  const card = level === 'easy' ? options[0]! : options.reduce((a, b) => (value(b) > value(a) ? b : a));
  const rest = hand.filter((c) => c.id !== card.id);
  // Easy players sometimes forget to call Page One.
  const call = level !== 'easy' || chance(`${s.seed}${p}${hand.length}`) > 0.35;
  return { type: 'play', by: p, id: card.id, suit: favouriteSuit(rest.length ? rest : hand), call };
}

export const pageOneRules: GameRules<PageOneState, PageOneAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.turn !== HUMAN || s.winner !== null) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type === 'play')
      return { cards: [a.id], message: s.hands[HUMAN]!.length === 2 ? 'Remember to call Page One!' : 'A good play.' };
    return { message: a.type === 'draw' ? 'Nothing fits — draw a card.' : 'Pass.' };
  },
  status: (s) => (s.winner === null ? 'playing' : s.winner === HUMAN ? 'won' : 'lost'),
  auto: (s) => {
    if (s.winner !== null || s.turn === HUMAN) return null;
    const action = cpuMove(s, s.turn);
    return {
      action,
      delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, action.type === 'draw', `${s.seed}${s.pile.length}`),
    };
  },
  score: (s) => s.hands[HUMAN]!.length,
  summary: (s) => (s.winner === HUMAN ? 'You emptied your hand first!' : `${seatName(s.seats, s.winner ?? 1)} went out first.`),
};
