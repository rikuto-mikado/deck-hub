import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

export const START_CHIPS = 1000;
export const BETS = [10, 25, 50, 100] as const;
export const MAX_HANDS = 4;
/** Reshuffle once this fraction of the shoe has been dealt. */
const PENETRATION = 0.75;

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender';

export interface Hand {
  cards: StandardCard[];
  bet: number;
  doubled: boolean;
  done: boolean;
  surrendered: boolean;
  /** Came from a split: 21 in two cards is not a blackjack. */
  split: boolean;
  outcome: Outcome | null;
  payout: number;
}

export interface BlackjackRules {
  decks: number;
  hitSoft17: boolean;
  /** Blackjack pays this × bet in profit (1.5 for 3:2, 1.2 for 6:5). */
  blackjackPays: number;
  surrender: boolean;
}

export interface BlackjackState {
  phase: 'bet' | 'insurance' | 'player' | 'dealer' | 'settled';
  rules: BlackjackRules;
  chips: number;
  bet: number;
  shoe: StandardCard[];
  dealer: StandardCard[];
  hands: Hand[];
  active: number;
  insurance: number;
  insurancePayout: number;
  seed: number;
  message: string;
}

export type BlackjackAction =
  | { type: 'bet'; amount: number }
  | { type: 'deal' }
  | { type: 'insurance'; take: boolean }
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double' }
  | { type: 'split' }
  | { type: 'surrender' }
  | { type: 'dealer' };

const cardValue = (c: StandardCard) => (c.rank === 1 ? 11 : Math.min(10, c.rank));

/** Best total and whether an Ace is still counted as 11. Face-down cards are ignored. */
export function handValue(cards: readonly StandardCard[]): { total: number; soft: boolean } {
  let total = 0,
    aces = 0;
  for (const c of cards) {
    if (!c.faceUp) continue;
    total += cardValue(c);
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

const reveal = (cards: readonly StandardCard[]) => cards.map((c) => (c.faceUp ? c : { ...c, faceUp: true }));
const isNatural = (cards: readonly StandardCard[]) => cards.length === 2 && handValue(reveal(cards)).total === 21;

function newHand(cards: StandardCard[], bet: number, split = false): Hand {
  return { cards, bet, doubled: false, done: false, surrendered: false, split, outcome: null, payout: 0 };
}

function freshShoe(decks: number, seed: number) {
  const rng = createRng(seed);
  return { shoe: shuffle(createStandardDeck({ decks }), rng), seed: nextSeed(rng) };
}

export function readRules(options: RuleOptions = {}): BlackjackRules {
  return {
    decks: Number(options.decks ?? '6') || 6,
    hitSoft17: options.dealer === 'h17',
    blackjackPays: options.payout === '6:5' ? 1.2 : 1.5,
    surrender: (options.surrender ?? 'on') === 'on',
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): BlackjackState {
  const rules = readRules(options);
  return {
    phase: 'bet',
    rules,
    chips: START_CHIPS,
    bet: BETS[0],
    ...freshShoe(rules.decks, nextSeed(rng)),
    dealer: [],
    hands: [],
    active: 0,
    insurance: 0,
    insurancePayout: 0,
    message: 'Place your bet.',
  };
}

function draw(s: BlackjackState, faceUp = true): [StandardCard, BlackjackState] {
  return [
    { ...s.shoe.at(-1)!, faceUp },
    { ...s, shoe: s.shoe.slice(0, -1) },
  ];
}

const current = (s: BlackjackState) => s.hands[s.active];

export const canDouble = (s: BlackjackState) => {
  const h = current(s);
  return s.phase === 'player' && !!h && h.cards.length === 2 && s.chips >= h.bet && !(h.split && h.cards[0]!.rank === 1);
};
export const canSplit = (s: BlackjackState) => {
  const h = current(s);
  return (
    s.phase === 'player' &&
    !!h &&
    h.cards.length === 2 &&
    cardValue(h.cards[0]!) === cardValue(h.cards[1]!) &&
    s.hands.length < MAX_HANDS &&
    s.chips >= h.bet &&
    // Split Aces cannot be split again.
    !(h.split && h.cards[0]!.rank === 1)
  );
};
export const canSurrender = (s: BlackjackState) =>
  s.rules.surrender && s.phase === 'player' && s.hands.length === 1 && s.hands[0]!.cards.length === 2 && !s.hands[0]!.split;

function updateHand(s: BlackjackState, patch: Partial<Hand>): BlackjackState {
  return { ...s, hands: s.hands.map((h, i) => (i === s.active ? { ...h, ...patch } : h)) };
}

/** Moves to the next unfinished hand, dealing the second card to split hands as needed. */
function advance(s: BlackjackState): BlackjackState {
  let next = s;
  for (let i = 0; i < next.hands.length; i++) {
    const h = next.hands[i]!;
    if (h.done) continue;
    next = { ...next, active: i };
    if (h.cards.length === 1) {
      const [c, after] = draw(next);
      next = { ...after, hands: after.hands.map((x, j) => (j === i ? { ...x, cards: [...x.cards, c] } : x)) };
      const hand = next.hands[i]!;
      // Split Aces receive one card only; any hand that reaches 21 stands automatically.
      if (hand.cards[0]!.rank === 1 || handValue(hand.cards).total === 21) {
        next = { ...next, hands: next.hands.map((x, j) => (j === i ? { ...x, done: true } : x)) };
        continue;
      }
    }
    return { ...next, phase: 'player' };
  }
  const live = next.hands.some((h) => !h.surrendered && handValue(h.cards).total <= 21);
  return live ? { ...next, phase: 'dealer', message: 'Dealer plays.' } : settle(next);
}

function settle(s: BlackjackState): BlackjackState {
  const dealer = reveal(s.dealer);
  const d = handValue(dealer).total;
  const dealerBJ = isNatural(dealer);
  let returned = 0;
  const hands = s.hands.map((h): Hand => {
    const stake = h.bet * (h.doubled ? 2 : 1);
    const p = handValue(h.cards).total;
    const natural = !h.split && s.hands.length === 1 && isNatural(h.cards);
    let outcome: Outcome;
    if (h.surrendered) outcome = 'surrender';
    else if (p > 21) outcome = 'bust';
    else if (natural && !dealerBJ) outcome = 'blackjack';
    else if (dealerBJ) outcome = natural ? 'push' : 'lose';
    else if (d > 21 || p > d) outcome = 'win';
    else if (p === d) outcome = 'push';
    else outcome = 'lose';
    const payout =
      outcome === 'blackjack'
        ? stake + stake * s.rules.blackjackPays
        : outcome === 'win'
          ? stake * 2
          : outcome === 'push'
            ? stake
            : outcome === 'surrender'
              ? stake / 2
              : 0;
    returned += payout;
    return { ...h, outcome, payout, done: true };
  });
  const insurancePayout = s.insurance && dealerBJ ? s.insurance * 3 : 0;
  const total = returned + insurancePayout;
  return {
    ...s,
    dealer,
    hands,
    phase: 'settled',
    chips: s.chips + total,
    insurancePayout,
    message: dealerBJ ? 'Dealer has blackjack.' : '',
  };
}

/** Dealer checks the hole card for blackjack (with an Ace or ten showing). */
function peek(s: BlackjackState): BlackjackState {
  const up = s.dealer[0]!;
  if (cardValue(up) >= 10 && isNatural(s.dealer)) return settle(s);
  const lostInsurance = s.insurance ? 'Insurance lost. ' : '';
  if (isNatural(s.hands[0]!.cards)) return settle({ ...s, message: lostInsurance });
  return { ...s, phase: 'player', message: lostInsurance };
}

function reduce(s: BlackjackState, a: BlackjackAction): BlackjackState {
  switch (a.type) {
    case 'bet':
      if ((s.phase !== 'bet' && s.phase !== 'settled') || a.amount > s.chips) return s;
      return { ...s, bet: a.amount };
    case 'deal': {
      if ((s.phase !== 'bet' && s.phase !== 'settled') || s.bet > s.chips) return s;
      let next: BlackjackState = {
        ...s,
        chips: s.chips - s.bet,
        dealer: [],
        hands: [],
        active: 0,
        insurance: 0,
        insurancePayout: 0,
        message: '',
      };
      if (next.shoe.length < 52 * s.rules.decks * (1 - PENETRATION))
        next = { ...next, ...freshShoe(s.rules.decks, s.seed), message: 'Shuffling the shoe.' };
      const take = (faceUp: boolean) => {
        const [c, after] = draw(next, faceUp);
        next = after;
        return c;
      };
      const p1 = take(true),
        d1 = take(true),
        p2 = take(true),
        d2 = take(false);
      next = { ...next, hands: [newHand([p1, p2], s.bet)], dealer: [d1, d2] };
      if (d1.rank === 1) return { ...next, phase: 'insurance', message: isNatural([p1, p2]) ? 'Even money?' : 'Insurance?' };
      return peek(next);
    }
    case 'insurance': {
      if (s.phase !== 'insurance') return s;
      const cost = a.take ? Math.floor(s.bet / 2) : 0;
      if (cost > s.chips) return s;
      return peek({ ...s, insurance: cost, chips: s.chips - cost });
    }
    case 'hit': {
      if (s.phase !== 'player') return s;
      const [c, after] = draw(s);
      const h = current(after)!;
      const cards = [...h.cards, c];
      const total = handValue(cards).total;
      const next = updateHand(after, { cards, done: total >= 21 });
      return total >= 21 ? advance(next) : next;
    }
    case 'stand':
      if (s.phase !== 'player') return s;
      return advance(updateHand(s, { done: true }));
    case 'double': {
      if (!canDouble(s)) return s;
      const h = current(s)!;
      const [c, after] = draw({ ...s, chips: s.chips - h.bet });
      return advance(updateHand(after, { cards: [...h.cards, c], doubled: true, done: true }));
    }
    case 'split': {
      if (!canSplit(s)) return s;
      const h = current(s)!;
      const hands = s.hands.slice();
      hands.splice(s.active, 1, newHand([h.cards[0]!], h.bet, true), newHand([h.cards[1]!], h.bet, true));
      return advance({ ...s, chips: s.chips - h.bet, hands });
    }
    case 'surrender':
      if (!canSurrender(s)) return s;
      return advance(updateHand(s, { surrendered: true, done: true }));
    case 'dealer': {
      if (s.phase !== 'dealer') return s;
      if (s.dealer.some((c) => !c.faceUp)) return { ...s, dealer: reveal(s.dealer) };
      const { total, soft } = handValue(s.dealer);
      if (total > 17 || (total === 17 && !(soft && s.rules.hitSoft17))) return settle(s);
      const [c, after] = draw(s);
      return { ...after, dealer: [...s.dealer, c] };
    }
  }
}

type Advice = 'Hit' | 'Stand' | 'Double' | 'Split' | 'Surrender';

/** Multi-deck basic strategy (dealer peeks, double after split allowed). */
export function basicStrategy(s: BlackjackState): Advice | null {
  const hand = s.hands[s.active];
  const up = s.dealer[0];
  if (s.phase !== 'player' || !hand || !up) return null;
  const u = up.rank === 1 ? 11 : Math.min(10, up.rank);
  const { total, soft } = handValue(hand.cards);
  const firstTwo = hand.cards.length === 2;
  const dbl = (fallback: Advice): Advice => (canDouble(s) ? 'Double' : fallback);

  if (canSplit(s)) {
    const v = hand.cards[0]!.rank === 1 ? 11 : Math.min(10, hand.cards[0]!.rank);
    if (v === 11 || v === 8) return 'Split';
    if (v === 9 && u !== 7 && u <= 9) return 'Split';
    if ((v === 7 || v === 2 || v === 3) && u <= 7) return 'Split';
    if (v === 6 && u <= 6) return 'Split';
    if (v === 4 && (u === 5 || u === 6)) return 'Split';
  }
  if (canSurrender(s) && !soft && ((total === 16 && u >= 9) || (total === 15 && u === 10))) return 'Surrender';
  if (soft && firstTwo) {
    if (total >= 19) return 'Stand';
    if (total === 18) return u >= 3 && u <= 6 ? dbl('Stand') : u <= 8 ? 'Stand' : 'Hit';
    if (total === 17) return u >= 3 && u <= 6 ? dbl('Hit') : 'Hit';
    if (total >= 15) return u >= 4 && u <= 6 ? dbl('Hit') : 'Hit';
    return u >= 5 && u <= 6 ? dbl('Hit') : 'Hit';
  }
  if (soft) return total >= 19 || (total === 18 && u <= 8) ? 'Stand' : 'Hit';
  if (total >= 17) return 'Stand';
  if (total >= 13) return u <= 6 ? 'Stand' : 'Hit';
  if (total === 12) return u >= 4 && u <= 6 ? 'Stand' : 'Hit';
  if (total === 11) return u <= 10 ? dbl('Hit') : 'Hit';
  if (total === 10) return u <= 9 ? dbl('Hit') : 'Hit';
  if (total === 9) return u >= 3 && u <= 6 ? dbl('Hit') : 'Hit';
  return 'Hit';
}

function hint(s: BlackjackState) {
  if (s.phase === 'insurance') return { message: 'Basic strategy: decline insurance.' };
  const advice = basicStrategy(s);
  return advice ? { message: `Basic strategy: ${advice}.` } : null;
}

export const blackjackRules: GameRules<BlackjackState, BlackjackAction> = {
  setup,
  reduce,
  hint,
  status: (s) => ((s.phase === 'bet' || s.phase === 'settled') && s.chips < BETS[0] ? 'lost' : 'playing'),
  auto: (s) => (s.phase === 'dealer' ? { action: { type: 'dealer' }, delayMs: 650 } : null),
  score: (s) => s.chips,
  summary: () => 'You are out of chips.',
};
