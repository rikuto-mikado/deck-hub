import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, sortTrickHand, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import { SUIT_SYMBOL, cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';

export const YOU = 0;
export const COURT = 1;
export const TRICKS = 8;

/** Four court allies, each usable once per fiefdom. */
export type Ally = 'scout' | 'envoy' | 'edict' | 'herald';
export const ALLIES: { id: Ally; card: string; name: string; text: string }[] = [
  { id: 'scout', card: 'J♠', name: 'Scout', text: 'Discard a card and draw a new one.' },
  { id: 'envoy', card: 'Q♥', name: 'Envoy', text: 'Swap a card with a random card from the Court.' },
  { id: 'edict', card: 'J♦', name: 'Edict', text: 'This trick has no trump.' },
  { id: 'herald', card: 'Q♣', name: 'Herald', text: 'Take the lead when the Court would lead.' },
];

export interface EmissaryState {
  /** The four rulers (Kings), visited in order. */
  rulers: StandardCard[];
  demands: number[];
  results: (boolean | null)[];
  round: number;
  hand: StandardCard[];
  court: StandardCard[];
  deck: StandardCard[];
  trick: TrickPlay[];
  leader: number;
  won: [number, number];
  used: Ally[];
  noTrump: boolean;
  phase: 'play' | 'roundOver' | 'over';
  goal: number;
  seed: number;
  log: string;
}

export type EmissaryAction =
  { type: 'play'; by: number; id: CardId } | { type: 'ally'; ally: Ally; id?: CardId } | { type: 'collect' } | { type: 'next' };

function deal(s: EmissaryState, round: number): EmissaryState {
  const rng = createRng(s.seed);
  const deck = shuffle(
    createStandardDeck().filter((c) => c.rank <= 10),
    rng,
  );
  const ruler = s.rulers[round]!;
  return {
    ...s,
    round,
    hand: sortTrickHand(deck.slice(0, TRICKS)).map((c) => ({ ...c, faceUp: true })),
    court: deck.slice(TRICKS, TRICKS * 2),
    deck: deck.slice(TRICKS * 2),
    trick: [],
    leader: YOU,
    won: [0, 0],
    used: [],
    noTrump: false,
    phase: 'play',
    seed: nextSeed(rng),
    log: `The ${cardLabel(ruler)} demands exactly ${s.demands[round]} tricks. ${SUIT_SYMBOL[ruler.suit]} is trump. You lead.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): EmissaryState {
  const rulers = shuffle(
    createStandardDeck().filter((c) => c.rank === 13),
    rng,
  ).map((c) => ({ ...c, faceUp: true }));
  const demands = rulers.map(() => 2 + rng.int(5));
  const base: EmissaryState = {
    rulers,
    demands,
    results: [null, null, null, null],
    round: 0,
    hand: [],
    court: [],
    deck: [],
    trick: [],
    leader: YOU,
    won: [0, 0],
    used: [],
    noTrump: false,
    phase: 'play',
    goal: options.goal === '4' ? 4 : 3,
    seed: nextSeed(rng),
    log: '',
  };
  return deal(base, 0);
}

export const trumpOf = (s: EmissaryState): Suit | null => (s.noTrump ? null : s.rulers[s.round]!.suit);
const toAct = (s: EmissaryState) => (s.trick.length === 0 ? s.leader : 1 - s.leader);

export function legal(s: EmissaryState, by: number): StandardCard[] {
  const hand = by === YOU ? s.hand : s.court;
  return legalMoves(hand, s.trick[0]?.card.suit ?? null);
}

/** The Court always tries to win: lowest winning card, else its lowest card. On a lead, its strongest. */
export function courtMove(s: EmissaryState): StandardCard {
  const options = legal(s, COURT);
  const trump = trumpOf(s);
  const power = (c: StandardCard) => (c.suit === trump ? 100 : 0) + aceHigh(c);
  if (!s.trick.length) {
    const nonTrump = options.filter((c) => c.suit !== trump);
    return (nonTrump.length ? nonTrump : options).reduce((a, b) => (aceHigh(b) > aceHigh(a) ? b : a));
  }
  const winners = options.filter((c) => trickWinner([...s.trick, { by: COURT, card: c }], trump).by === COURT);
  const pool = winners.length ? winners : options;
  return pool.reduce((a, b) => (power(b) < power(a) ? b : a));
}

function finishTrick(s: EmissaryState): EmissaryState {
  const w = trickWinner(s.trick, trumpOf(s)).by;
  const won: [number, number] = [s.won[0] + (w === YOU ? 1 : 0), s.won[1] + (w === COURT ? 1 : 0)];
  const next = { ...s, won, trick: [], leader: w, noTrump: false };
  const tricksPlayed = won[0] + won[1];
  if (tricksPlayed < TRICKS) return { ...next, log: `${w === YOU ? 'You take' : 'The Court takes'} the trick (${won[0]} won).` };
  const ok = won[0] === s.demands[s.round];
  const results = s.results.map((r, i) => (i === s.round ? ok : r));
  return {
    ...next,
    results,
    phase: s.round === 3 ? 'over' : 'roundOver',
    log: ok
      ? `Exactly ${won[0]} tricks — the ${cardLabel(s.rulers[s.round]!)} swears fealty!`
      : `${won[0]} tricks instead of ${s.demands[s.round]} — the ${cardLabel(s.rulers[s.round]!)} refuses you.`,
  };
}

function reduce(s: EmissaryState, a: EmissaryAction): EmissaryState {
  if (a.type === 'next') return s.phase === 'roundOver' ? deal(s, s.round + 1) : s;
  if (s.phase !== 'play') return s;
  if (a.type === 'collect') return s.trick.length === 2 ? finishTrick(s) : s;
  if (a.type === 'play') {
    if (a.by !== toAct(s) || s.trick.length >= 2) return s;
    const card = legal(s, a.by).find((c) => c.id === a.id);
    if (!card) return s;
    const shown = { ...card, faceUp: true };
    const next: EmissaryState = {
      ...s,
      hand: a.by === YOU ? s.hand.filter((c) => c.id !== a.id) : s.hand,
      court: a.by === COURT ? s.court.filter((c) => c.id !== a.id) : s.court,
      trick: [...s.trick, { by: a.by, card: shown }],
    };
    return next.trick.length === 2 ? next : { ...next, log: a.by === COURT ? `The Court leads ${cardLabel(card)}.` : s.log };
  }
  if (s.used.includes(a.ally)) return s;
  const used = [...s.used, a.ally];
  switch (a.ally) {
    case 'scout': {
      const card = s.hand.find((c) => c.id === a.id);
      const fresh = s.deck.at(-1);
      if (!card || !fresh) return s;
      return {
        ...s,
        used,
        hand: sortTrickHand([...s.hand.filter((c) => c.id !== a.id), { ...fresh, faceUp: true }]),
        deck: s.deck.slice(0, -1),
        log: `The Scout trades your ${cardLabel(card)} for a fresh card.`,
      };
    }
    case 'envoy': {
      const card = s.hand.find((c) => c.id === a.id);
      if (!card || !s.court.length) return s;
      const rng = createRng(s.seed);
      const k = rng.int(s.court.length);
      const theirs = s.court[k]!;
      return {
        ...s,
        used,
        seed: nextSeed(rng),
        hand: sortTrickHand([...s.hand.filter((c) => c.id !== a.id), { ...theirs, faceUp: true }]),
        court: s.court.map((c, i) => (i === k ? { ...card, faceUp: false } : c)),
        log: `The Envoy swaps your ${cardLabel(card)} for the Court’s ${cardLabel(theirs)}.`,
      };
    }
    case 'edict':
      return s.trick.length < 2 ? { ...s, used, noTrump: true, log: 'By Edict, this trick has no trump.' } : s;
    case 'herald':
      return s.trick.length === 0 && s.leader === COURT
        ? { ...s, used, leader: YOU, log: 'The Herald seizes the lead for you.' }
        : s;
  }
}

function hint(s: EmissaryState): Hint | null {
  if (s.phase !== 'play' || toAct(s) !== YOU) return null;
  const need = s.demands[s.round]! - s.won[0];
  const left = TRICKS - s.won[0] - s.won[1];
  const options = legal(s, YOU);
  const trump = trumpOf(s);
  const wins = (c: StandardCard) =>
    s.trick.length ? trickWinner([...s.trick, { by: YOU, card: c }], trump).by === YOU : c.suit === trump || aceHigh(c) >= 13;
  const wantWin = need > 0 && need >= left / 2;
  const pick = options.filter((c) => wins(c) === wantWin);
  const pool = pick.length ? pick : options;
  const card = wantWin
    ? pool.reduce((a, b) => (aceHigh(b) < aceHigh(a) ? b : a))
    : pool.reduce((a, b) => (aceHigh(b) > aceHigh(a) ? b : a));
  return {
    cards: [card.id],
    message: need <= 0 ? 'You have enough tricks — lose the rest.' : `You still need ${need} trick${need > 1 ? 's' : ''}.`,
  };
}

const earned = (s: EmissaryState) => s.results.filter(Boolean).length;

export const emissaryRules: GameRules<EmissaryState, EmissaryAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'over' ? 'playing' : earned(s) >= s.goal ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase !== 'play') return null;
    if (s.trick.length === 2) return { action: { type: 'collect' }, delayMs: 950 };
    if (toAct(s) === COURT)
      return { action: { type: 'play', by: COURT, id: courtMove(s).id }, delayMs: s.trick.length ? 650 : 900 };
    return null;
  },
  score: earned,
  summary: (s) => `${earned(s)} of 4 fiefdoms won (needed ${s.goal}).`,
};
