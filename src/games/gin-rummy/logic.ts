import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { bestMelds, deadwoodValue, layOff } from '@/core/rules/melds';
import { cardLabel, type CardId, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, readLevel, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
export const KNOCK = 10;
export const GIN_BONUS = 25;
export const UNDERCUT_BONUS = 25;

export interface HandResult {
  knocker: number;
  gin: boolean;
  undercut: boolean;
  winner: number | null;
  points: number;
  melds: [StandardCard[][], StandardCard[][]];
  deadwood: [StandardCard[], StandardCard[]];
}

export interface GinState {
  seat: CpuSeat;
  hands: [StandardCard[], StandardCard[]];
  stock: StandardCard[];
  discard: StandardCard[];
  turn: number;
  phase: 'draw' | 'discard' | 'handOver' | 'matchOver';
  /** Card taken from the discard pile this turn (it may not be thrown straight back). */
  taken: CardId | null;
  scores: [number, number];
  target: number;
  dealer: number;
  result: HandResult | null;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type GinAction =
  | { type: 'draw'; by: number; from: 'stock' | 'discard' }
  | { type: 'discard'; by: number; id: CardId; knock: boolean }
  | { type: 'next' };

const sortHand = (h: StandardCard[]) => {
  // Melds first, then deadwood by rank, so the player sees what they have.
  const { melds, deadwood } = bestMelds(h);
  return [
    ...melds.flatMap((m) => m.toSorted((a, b) => a.rank - b.rank)),
    ...deadwood.toSorted((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit)),
  ];
};

function deal(s: GinState, dealer: number): GinState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const first = 1 - dealer;
  return {
    ...s,
    hands: [sortHand(deck.slice(0, 10)).map((c) => ({ ...c, faceUp: true })), deck.slice(10, 20)],
    discard: [{ ...deck[20]!, faceUp: true }],
    stock: deck.slice(21),
    turn: first,
    phase: 'draw',
    taken: null,
    dealer,
    result: null,
    seed: nextSeed(rng),
    log: first === HUMAN ? 'Your turn: draw from the stock or take the discard.' : `${s.seat.name} starts.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): GinState {
  const seed = nextSeed(rng);
  const [seat] = drawSeats(rng, 1);
  const base = {
    seat: seat!,
    hands: [[], []] as [StandardCard[], StandardCard[]],
    stock: [],
    discard: [],
    turn: 0,
    phase: 'draw' as const,
    taken: null,
    scores: [0, 0] as [number, number],
    target: options.target === '50' ? 50 : 100,
    dealer: 1,
    result: null,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1);
}

export const deadwoodOf = (hand: readonly StandardCard[]) => bestMelds(hand).points;

/** Deadwood left after discarding `id` from an 11-card hand. */
export const deadwoodAfter = (hand: readonly StandardCard[], id: CardId) => deadwoodOf(hand.filter((c) => c.id !== id));
export const canKnock = (s: GinState, p: number, id: CardId) =>
  s.phase === 'discard' && s.turn === p && deadwoodAfter(s.hands[p]!, id) <= KNOCK;

function settle(s: GinState, knocker: number): GinState {
  const defender = 1 - knocker;
  const k = bestMelds(s.hands[knocker]!);
  const d0 = bestMelds(s.hands[defender]!);
  const gin = k.points === 0;
  const d = gin
    ? { melds: d0.melds, deadwood: d0.deadwood }
    : (() => {
        const off = layOff(k.melds, d0.deadwood);
        return { melds: d0.melds, deadwood: off.deadwood };
      })();
  const dPoints = d.deadwood.reduce((n, c) => n + deadwoodValue(c), 0);
  let winner: number,
    points: number,
    undercut = false;
  if (gin) [winner, points] = [knocker, GIN_BONUS + dPoints];
  else if (dPoints <= k.points) [winner, points, undercut] = [defender, UNDERCUT_BONUS + k.points - dPoints, true];
  else [winner, points] = [knocker, dPoints - k.points];
  const scores: [number, number] = [...s.scores];
  scores[winner] = scores[winner]! + points;
  const name = (p: number) => (p === HUMAN ? 'You' : s.seat.name);
  const melds: [StandardCard[][], StandardCard[][]] = knocker === 0 ? [k.melds, d.melds] : [d.melds, k.melds];
  const deadwood: [StandardCard[], StandardCard[]] = knocker === 0 ? [k.deadwood, d.deadwood] : [d.deadwood, k.deadwood];
  const how = gin ? 'Gin!' : undercut ? 'Undercut!' : 'Knock.';
  return {
    ...s,
    hands: [s.hands[0], s.hands[1].map((c) => ({ ...c, faceUp: true }))],
    scores,
    result: { knocker, gin, undercut, winner, points, melds, deadwood },
    phase: Math.max(...scores) >= s.target ? 'matchOver' : 'handOver',
    log: `${how} ${name(winner)} ${winner === HUMAN ? 'score' : 'scores'} ${points}.`,
  };
}

function reduce(s: GinState, a: GinAction): GinState {
  switch (a.type) {
    case 'draw': {
      if (s.phase !== 'draw' || a.by !== s.turn) return s;
      const pile = a.from === 'stock' ? s.stock : s.discard;
      const card = pile.at(-1);
      if (!card) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = [...hands[a.by]!, { ...card, faceUp: a.by === HUMAN }];
      if (a.by === HUMAN) hands[0] = sortHand(hands[0]);
      const who = a.by === HUMAN ? 'You take' : `${s.seat.name} takes`;
      return {
        ...s,
        hands,
        stock: a.from === 'stock' ? s.stock.slice(0, -1) : s.stock,
        discard: a.from === 'discard' ? s.discard.slice(0, -1) : s.discard,
        phase: 'discard',
        taken: a.from === 'discard' ? card.id : null,
        log: a.from === 'discard' ? `${who} the ${cardLabel(card)}.` : `${who} a card from the stock.`,
      };
    }
    case 'discard': {
      if (s.phase !== 'discard' || a.by !== s.turn || a.id === s.taken) return s;
      const card = s.hands[a.by]!.find((c) => c.id === a.id);
      if (!card) return s;
      if (a.knock && !canKnock(s, a.by, a.id)) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = hands[a.by]!.filter((c) => c.id !== a.id);
      if (a.by === HUMAN) hands[0] = sortHand(hands[0]);
      const next: GinState = { ...s, hands, discard: [...s.discard, { ...card, faceUp: true }], taken: null };
      if (a.knock) return settle(next, a.by);
      // Two cards left in the stock and nobody knocked: the hand is dead.
      if (next.stock.length <= 2)
        return { ...next, phase: 'handOver', result: null, log: 'The stock is down to two cards — no score this hand.' };
      return {
        ...next,
        phase: 'draw',
        turn: 1 - a.by,
        log: `${a.by === HUMAN ? 'You discard' : `${s.seat.name} discards`} the ${cardLabel(card)}.`,
      };
    }
    case 'next':
      return s.phase === 'handOver' ? deal(s, 1 - s.dealer) : s;
  }
}

/** Best discard for an 11-card hand: least deadwood left, throwing high cards on ties. */
export function bestDiscard(hand: readonly StandardCard[], taken: CardId | null): StandardCard {
  let best: StandardCard | null = null,
    bestV = Infinity;
  for (const c of hand) {
    if (c.id === taken) continue;
    const v = deadwoodAfter(hand, c.id) * 100 - deadwoodValue(c);
    if (v < bestV) [best, bestV] = [c, v];
  }
  return best!;
}

export function cpuAct(s: GinState, level: CpuLevel = s.cpu): GinAction {
  const p = s.turn;
  const hand = s.hands[p]!;
  if (s.phase === 'draw') {
    const top = s.discard.at(-1);
    if (top) {
      const withTop = [...hand, top];
      const after = deadwoodAfter(withTop, bestDiscard(withTop, top.id).id);
      const now = deadwoodOf(hand);
      const takes = level === 'easy' ? after < now - 6 && chance(`${s.stock.length}`) < 0.6 : after < now;
      if (takes) return { type: 'draw', by: p, from: 'discard' };
    }
    return { type: 'draw', by: p, from: 'stock' };
  }
  const card =
    level === 'easy' && chance(`${s.seed}${s.stock.length}`) < 0.3
      ? hand.filter((c) => c.id !== s.taken).reduce((a, b) => (deadwoodValue(b) > deadwoodValue(a) ? b : a))
      : bestDiscard(hand, s.taken);
  const dw = deadwoodAfter(hand, card.id);
  const risk = TRAITS[s.seat.personality].risk;
  // Conservative players knock at once; ambitious ones hold out for Gin while the stock lasts.
  const waitFor = risk > 0.6 ? 3 : level === 'hard' ? 6 : 10;
  const knock = dw <= KNOCK && (dw <= waitFor || s.stock.length < 12 || dw === 0);
  return { type: 'discard', by: p, id: card.id, knock };
}

function hint(s: GinState): Hint | null {
  if (s.turn !== HUMAN) return null;
  if (s.phase === 'draw') {
    const a = cpuAct({ ...s, cpu: 'hard' }, 'hard');
    return a.type === 'draw' && a.from === 'discard'
      ? { cards: [s.discard.at(-1)!.id], message: 'Take the discard — it improves your melds.' }
      : { message: 'Draw from the stock.' };
  }
  if (s.phase === 'discard') {
    const card = bestDiscard(s.hands[HUMAN], s.taken);
    const dw = deadwoodAfter(s.hands[HUMAN], card.id);
    return {
      cards: [card.id],
      message:
        dw === 0 ? 'Discard it and go Gin!' : dw <= KNOCK ? `You could knock with ${dw} deadwood.` : `Deadwood would be ${dw}.`,
    };
  }
  return null;
}

export const ginRules: GameRules<GinState, GinAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[0] > s.scores[1] ? 'won' : 'lost'),
  auto: (s) => {
    if ((s.phase !== 'draw' && s.phase !== 'discard') || s.turn !== CPU) return null;
    const action = cpuAct(s);
    const tense = action.type === 'discard' && action.knock;
    return { action, delayMs: 380 + tempo(s.seat.personality, s.cpu, tense) };
  },
  score: (s) => s.scores[0],
  summary: (s) => `You ${s.scores[0]} – ${s.scores[1]} ${s.seat.name} (game to ${s.target}).`,
};
