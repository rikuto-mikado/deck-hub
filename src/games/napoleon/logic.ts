import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, sortTrickHand, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import { SUITS, SUIT_SYMBOL, cardLabel, suitColor, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const HAND = 12;
export const MIN_BID = 13;
/** Suit order for equal bids: ♠ > ♥ > ♦ > ♣. */
const SUIT_RANK: Record<Suit, number> = { spades: 4, hearts: 3, diamonds: 2, clubs: 1 };

export interface Bid {
  count: number;
  suit: Suit;
}

export interface NapoleonState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  kitty: StandardCard[];
  phase: 'bid' | 'declare' | 'play' | 'dealOver' | 'matchOver';
  dealer: number;
  turn: number;
  bids: (Bid | 'pass' | null)[];
  best: { by: number; bid: Bid } | null;
  napoleon: number | null;
  adjutantCard: StandardCard | null;
  /** Seat holding the adjutant card, revealed once it is played. */
  adjutant: number | null;
  revealed: boolean;
  trick: TrickPlay[];
  leader: number;
  trickNo: number;
  /** Face cards (10–A) captured by each seat. */
  faces: number[];
  points: number[];
  deal: number;
  deals: number;
  lastResult: string;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type NapoleonAction =
  | { type: 'bid'; by: number; bid: Bid | null }
  | { type: 'declare'; adjutant: CardId; discard: CardId[] }
  | { type: 'play'; by: number; id: CardId }
  | { type: 'collect' }
  | { type: 'next' };

export const isFace = (c: StandardCard) => c.rank === 1 || c.rank >= 10;
const beats = (a: Bid, b: Bid | null) =>
  !b || a.count > b.count || (a.count === b.count && SUIT_RANK[a.suit] > SUIT_RANK[b.suit]);
const otherJackSuit = (s: Suit) => SUITS.find((x) => x !== s && suitColor(x) === suitColor(s))!;

export const isMighty = (c: StandardCard) => c.suit === 'spades' && c.rank === 1;
/** Yoromeki (♥Q): the only card that beats the Mighty, when both fall in the same trick. */
export const isYoromeki = (c: StandardCard) => c.suit === 'hearts' && c.rank === 12;

/** Card power in a trick: Mighty, then the trump Jack (正J), the same-colour Jack (裏J), then trumps. */
export function powerOf(c: StandardCard, trump: Suit): number {
  if (isMighty(c)) return 1000;
  if (c.rank === 11 && c.suit === trump) return 900;
  if (c.rank === 11 && c.suit === otherJackSuit(trump)) return 800;
  return aceHigh(c);
}

export function winnerOf(trick: readonly TrickPlay[], trump: Suit): number {
  const mighty = trick.find((t) => isMighty(t.card));
  const yoro = trick.find((t) => isYoromeki(t.card));
  if (mighty && yoro) return yoro.by;
  // Special cards win whatever suit was led.
  const special = trick.filter((t) => powerOf(t.card, trump) >= 800);
  if (special.length) return special.reduce((a, b) => (powerOf(b.card, trump) > powerOf(a.card, trump) ? b : a)).by;
  return trickWinner(trick, trump).by;
}

function deal(s: NapoleonState, dealNo: number, dealer: number): NapoleonState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const first = (dealer + 1) % 4;
  return {
    ...s,
    hands: Array.from({ length: 4 }, (_, p) =>
      sortTrickHand(deck.slice(p * HAND, p * HAND + HAND)).map((c) => ({ ...c, faceUp: p === HUMAN })),
    ),
    kitty: deck.slice(HAND * 4),
    phase: 'bid',
    dealer,
    turn: first,
    bids: [null, null, null, null],
    best: null,
    napoleon: null,
    adjutantCard: null,
    adjutant: null,
    revealed: false,
    trick: [],
    leader: first,
    trickNo: 0,
    faces: [0, 0, 0, 0],
    deal: dealNo,
    seed: nextSeed(rng),
    log: `Deal ${dealNo}. Bid how many of the 20 face cards (10–A) your side will take, with a trump suit.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): NapoleonState {
  const seed = nextSeed(rng);
  const base = {
    seats: drawSeats(rng, 3),
    hands: [],
    kitty: [],
    phase: 'bid' as const,
    dealer: 3,
    turn: 0,
    bids: [],
    best: null,
    napoleon: null,
    adjutantCard: null,
    adjutant: null,
    revealed: false,
    trick: [],
    leader: 0,
    trickNo: 0,
    faces: [0, 0, 0, 0],
    points: [0, 0, 0, 0],
    deal: 1,
    deals: Number(options.deals ?? '3') || 3,
    lastResult: '',
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1, 3);
}

/** Face cards a hand can expect to win with `trump`, the way a CPU sizes up its bid. */
export function handValue(hand: readonly StandardCard[], trump: Suit): number {
  let v = 0;
  for (const c of hand) {
    const p = powerOf(c, trump);
    if (p >= 800) v += 2.6;
    else if (c.suit === trump) v += aceHigh(c) >= 12 ? 1.8 : 0.9;
    else if (c.rank === 1) v += 1.3;
    else if (c.rank === 13) v += 0.5;
  }
  return v * 1.45 + 4; // the partner and the kitty help
}

export function cpuBid(s: NapoleonState, p: number): Bid | null {
  const hand = s.hands[p]!;
  const suit = SUITS.reduce((a, b) => (handValue(hand, b) > handValue(hand, a) ? b : a));
  const risk = TRAITS[personalityOf(s.seats, p)].risk;
  const cap = Math.min(20, Math.floor(handValue(hand, suit) + risk * 2 - (s.cpu === 'easy' ? 1 : 0)));
  for (let n = MIN_BID; n <= cap; n++) {
    const bid = { count: n, suit };
    if (beats(bid, s.best?.bid ?? null)) return bid;
  }
  return null;
}

const nextBidder = (s: NapoleonState, from: number) => {
  for (let k = 1; k <= 4; k++) {
    const q = (from + k) % 4;
    if (s.bids[q] !== 'pass') return q;
  }
  return from;
};

/** The Napoleon names the strongest card it lacks; the holder becomes its secret ally. */
export function chooseAdjutant(hand: readonly StandardCard[], trump: Suit): StandardCard {
  const wish = [
    { suit: 'spades' as Suit, rank: 1 },
    { suit: trump, rank: 11 },
    { suit: otherJackSuit(trump), rank: 11 },
    { suit: trump, rank: 1 },
    { suit: trump, rank: 13 },
    ...SUITS.filter((x) => x !== trump).map((x) => ({ suit: x, rank: 1 })),
  ];
  const want = wish.find((w) => !hand.some((c) => c.suit === w.suit && c.rank === w.rank)) ?? wish[0]!;
  return createStandardDeck().find((c) => c.suit === want.suit && c.rank === want.rank)!;
}

/** Throws away the four weakest cards, keeping trumps and the specials. */
export function chooseDiscards(hand: readonly StandardCard[], trump: Suit): StandardCard[] {
  const keep = (c: StandardCard) =>
    powerOf(c, trump) >= 800 ? 999 : (c.suit === trump ? 100 : 0) + aceHigh(c) + (isFace(c) ? 5 : 0);
  return hand.toSorted((a, b) => keep(a) - keep(b)).slice(0, 4);
}

export const toAct = (s: NapoleonState) => (s.phase === 'play' && s.trick.length < 4 ? (s.leader + s.trick.length) % 4 : null);
export const trumpOf = (s: NapoleonState): Suit => s.best!.bid.suit;
export const legal = (s: NapoleonState, p: number) => legalMoves(s.hands[p]!, s.trick[0]?.card.suit ?? null);

/** Which side a seat believes another seat is on, from what has been revealed. */
const allied = (s: NapoleonState, p: number, q: number) => {
  const nap = s.napoleon!;
  const side = (x: number) => x === nap || (s.adjutant === x && (s.revealed || x === p));
  return side(p) === side(q);
};

export function cpuMove(s: NapoleonState, p: number, level: CpuLevel = s.cpu): StandardCard {
  const options = legal(s, p);
  if (options.length === 1) return options[0]!;
  if (level === 'easy' && pick(`${s.seed}${p}${s.trickNo}`, 3) === 0) return options[pick(`${p}${s.trickNo}`, options.length)]!;
  const trump = trumpOf(s);
  const pw = (c: StandardCard) => (powerOf(c, trump) >= 800 ? powerOf(c, trump) : (c.suit === trump ? 100 : 0) + aceHigh(c));
  const low = (cs: StandardCard[]) => cs.reduce((a, b) => (pw(b) < pw(a) ? b : a));
  const high = (cs: StandardCard[]) => cs.reduce((a, b) => (pw(b) > pw(a) ? b : a));
  const tricky = TRAITS[personalityOf(s.seats, p)].bluff > 0.6;
  if (!s.trick.length) {
    // The Napoleon side leads trumps to draw them; others lead off-suit Aces. A tricky adjutant hides early.
    const onNapSide = p === s.napoleon || (s.adjutant === p && (!tricky || s.trickNo > 4));
    const trumps = options.filter((c) => c.suit === trump || pw(c) >= 800);
    if (onNapSide && trumps.length) return high(trumps);
    const aces = options.filter((c) => c.rank === 1 && c.suit !== trump);
    return aces.length ? aces[0]! : low(options);
  }
  const faces = s.trick.filter((t) => isFace(t.card)).length;
  const current = winnerOf(s.trick, trump);
  const winners = options.filter((c) => winnerOf([...s.trick, { by: p, card: c }], trump) === p);
  if (allied(s, p, current)) {
    // Feed face cards to a partner who is winning.
    const myFaces = options.filter((c) => isFace(c) && pw(c) < 800);
    return myFaces.length ? high(myFaces) : low(options);
  }
  if (winners.length && (faces > 0 || level === 'hard')) return low(winners);
  const plain = options.filter((c) => !isFace(c));
  return plain.length ? low(plain) : low(options);
}

function scoreDeal(s: NapoleonState): NapoleonState {
  const nap = s.napoleon!;
  const adj = s.adjutant;
  const sideFaces = s.faces[nap]! + (adj !== null && adj !== nap ? s.faces[adj]! : 0);
  const made = sideFaces >= s.best!.bid.count;
  const points = s.points.map((pts, p) => {
    const onSide = p === nap || p === adj;
    if (p === nap) return pts + (made ? 2 : -2) * (adj === nap || adj === null ? 2 : 1);
    if (onSide) return pts + (made ? 1 : -1);
    return pts + (made ? -1 : 1);
  });
  const last = s.deal >= s.deals;
  const result = `${seatName(s.seats, nap)}'s side took ${sideFaces} face cards (bid ${s.best!.bid.count}) — ${made ? 'Napoleon wins' : 'the allies win'}.`;
  return { ...s, points, lastResult: result, phase: last ? 'matchOver' : 'dealOver', log: result };
}

function reduce(s: NapoleonState, a: NapoleonAction): NapoleonState {
  switch (a.type) {
    case 'bid': {
      if (s.phase !== 'bid' || a.by !== s.turn) return s;
      if (a.bid && (a.bid.count < MIN_BID || a.bid.count > 20 || !beats(a.bid, s.best?.bid ?? null))) return s;
      const bids = s.bids.map((b, p) => (p === a.by ? (a.bid ?? 'pass') : b));
      const best = a.bid ? { by: a.by, bid: a.bid } : s.best;
      const who = seatName(s.seats, a.by);
      const log = a.bid
        ? `${who} ${a.by === HUMAN ? 'bid' : 'bids'} ${a.bid.count}${SUIT_SYMBOL[a.bid.suit]}.`
        : `${who} ${a.by === HUMAN ? 'pass' : 'passes'}.`;
      const passes = bids.filter((b) => b === 'pass').length;
      if (passes === 4)
        return { ...deal({ ...s, seed: s.seed + 1 }, s.deal, s.dealer), log: 'Everyone passed — the cards are dealt again.' };
      const next = { ...s, bids, best, log };
      if (passes === 3 && best) {
        const nap = best.by;
        const hands = s.hands.map((h, p) =>
          p === nap ? sortTrickHand([...h, ...s.kitty.map((c) => ({ ...c, faceUp: p === HUMAN }))]) : h,
        );
        return {
          ...next,
          napoleon: nap,
          hands,
          kitty: [],
          phase: 'declare',
          turn: nap,
          log: `${log} ${seatName(s.seats, nap)} ${nap === HUMAN ? 'are' : 'is'} Napoleon with ${best.bid.count}${SUIT_SYMBOL[best.bid.suit]}.`,
        };
      }
      return { ...next, turn: nextBidder(next, a.by) };
    }
    case 'declare': {
      if (s.phase !== 'declare' || a.discard.length !== 4) return s;
      const nap = s.napoleon!;
      const hand = s.hands[nap]!;
      if (!a.discard.every((id) => hand.some((c) => c.id === id))) return s;
      const adjutantCard = createStandardDeck().find((c) => c.id === a.adjutant);
      if (!adjutantCard) return s;
      const discarded = hand.filter((c) => a.discard.includes(c.id));
      const hands = s.hands.map((h, p) => (p === nap ? h.filter((c) => !a.discard.includes(c.id)) : h));
      const holder = hands.findIndex((h) => h.some((c) => c.id === adjutantCard.id));
      // Face cards thrown into the discard count for the allies; a buried adjutant leaves Napoleon alone.
      const faces = [0, 0, 0, 0];
      return {
        ...s,
        hands,
        kitty: discarded.map((c) => ({ ...c, faceUp: false })),
        adjutantCard: { ...adjutantCard, faceUp: true },
        adjutant: holder >= 0 ? holder : nap,
        revealed: holder === nap || holder < 0,
        faces,
        phase: 'play',
        leader: nap,
        log: `The adjutant is the ${cardLabel(adjutantCard)}. ${seatName(s.seats, nap)} ${nap === HUMAN ? 'lead' : 'leads'}.`,
      };
    }
    case 'play': {
      if (toAct(s) !== a.by) return s;
      const card = legal(s, a.by).find((c) => c.id === a.id);
      if (!card) return s;
      const reveal = !s.revealed && s.adjutantCard?.id === card.id;
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        trick: [...s.trick, { by: a.by, card: { ...card, faceUp: true } }],
        revealed: s.revealed || reveal,
        log: reveal ? `${seatName(s.seats, a.by)} ${a.by === HUMAN ? 'reveal yourself' : 'is revealed'} as the adjutant!` : s.log,
      };
    }
    case 'collect': {
      if (s.trick.length !== 4) return s;
      const w = winnerOf(s.trick, trumpOf(s));
      const won = s.trick.filter((t) => isFace(t.card)).length;
      const faces = s.faces.map((f, p) => (p === w ? f + won : f));
      const next = {
        ...s,
        trick: [],
        leader: w,
        faces,
        trickNo: s.trickNo + 1,
        log: `${seatName(s.seats, w)} ${w === HUMAN ? 'take' : 'takes'} the trick${won ? ` (${won} face card${won > 1 ? 's' : ''})` : ''}.`,
      };
      return next.hands[0]!.length ? next : scoreDeal(next);
    }
    case 'next':
      return s.phase === 'dealOver' ? deal(s, s.deal + 1, (s.dealer + 1) % 4) : s;
  }
}

function hint(s: NapoleonState): Hint | null {
  if (s.phase === 'bid' && s.turn === HUMAN) {
    const b = cpuBid({ ...s, cpu: 'hard' }, HUMAN);
    return { message: b ? `You could bid ${b.count}${SUIT_SYMBOL[b.suit]}.` : 'Pass.' };
  }
  if (s.phase === 'declare' && s.napoleon === HUMAN)
    return { cards: chooseDiscards(s.hands[HUMAN]!, trumpOf(s)).map((c) => c.id), message: 'Discard your weakest four.' };
  return toAct(s) === HUMAN ? { cards: [cpuMove(s, HUMAN, 'hard').id] } : null;
}

export const napoleonRules: GameRules<NapoleonState, NapoleonAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.points[HUMAN]! >= Math.max(...s.points) ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase === 'bid' && s.turn !== HUMAN) {
      const bid = cpuBid(s, s.turn);
      return { action: { type: 'bid', by: s.turn, bid }, delayMs: 320 + tempo(personalityOf(s.seats, s.turn), s.cpu, !!bid) };
    }
    if (s.phase === 'declare' && s.napoleon !== HUMAN) {
      const hand = s.hands[s.napoleon!]!;
      const trump = trumpOf(s);
      const discard = chooseDiscards(hand, trump);
      const rest = hand.filter((c) => !discard.includes(c));
      return {
        action: { type: 'declare', adjutant: chooseAdjutant(rest, trump).id, discard: discard.map((c) => c.id) },
        delayMs: 900,
      };
    }
    if (s.phase !== 'play') return null;
    if (s.trick.length === 4) return { action: { type: 'collect' }, delayMs: 1000 };
    const p = toAct(s);
    if (p === null || p === HUMAN) return null;
    return { action: { type: 'play', by: p, id: cpuMove(s, p).id }, delayMs: 260 + tempo(personalityOf(s.seats, p), s.cpu) };
  },
  score: (s) => s.points[HUMAN]!,
  summary: (s) => s.points.map((x, p) => `${seatName(s.seats, p)} ${x}`).join(' · '),
};
