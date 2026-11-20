import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type CardId, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { chance, drawSeats, readLevel, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';
import { countValue, peggingPoints, scoreCribbageHand, type ScoreItem } from './scoring';

export const HUMAN = 0;
export const CPU = 1;

export interface ShowLine {
  who: string;
  cards: StandardCard[];
  items: ScoreItem[];
  total: number;
}

export interface CribbageState {
  seat: CpuSeat;
  hands: [StandardCard[], StandardCard[]];
  /** Cards each player keeps for the show (the pegging uses up `hands`). */
  kept: [StandardCard[], StandardCard[]];
  crib: StandardCard[];
  starter: StandardCard | null;
  stock: StandardCard[];
  dealer: number;
  phase: 'discard' | 'peg' | 'show' | 'matchOver';
  /** Cards played since the count last reset. */
  pile: StandardCard[];
  /** Every card played this hand, for display. */
  played: StandardCard[];
  turn: number;
  /** Players who have said "Go" in the current count. */
  goes: [boolean, boolean];
  lastPlayer: number | null;
  scores: [number, number];
  target: number;
  show: ShowLine[];
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type CribbageAction =
  { type: 'discard'; ids: CardId[] } | { type: 'play'; by: number; id: CardId } | { type: 'go'; by: number } | { type: 'next' };

const name = (s: CribbageState, p: number) => (p === HUMAN ? 'You' : s.seat.name);
const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
export const count = (s: CribbageState) => s.pile.reduce((n, c) => n + countValue(c), 0);

function deal(s: CribbageState, dealer: number): CribbageState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  return {
    ...s,
    hands: [sortHand(deck.slice(0, 6)).map((c) => ({ ...c, faceUp: true })), deck.slice(6, 12)],
    kept: [[], []],
    crib: [],
    starter: null,
    stock: deck.slice(12),
    dealer,
    phase: 'discard',
    pile: [],
    played: [],
    turn: 1 - dealer,
    goes: [false, false],
    lastPlayer: null,
    show: [],
    seed: nextSeed(rng),
    log: `Discard two cards to ${dealer === HUMAN ? 'your' : `${s.seat.name}'s`} crib.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): CribbageState {
  const seed = nextSeed(rng);
  const [seat] = drawSeats(rng, 1);
  const base = {
    seat: seat!,
    hands: [[], []] as [StandardCard[], StandardCard[]],
    kept: [[], []] as [StandardCard[], StandardCard[]],
    crib: [],
    starter: null,
    stock: [],
    dealer: 1,
    phase: 'discard' as const,
    pile: [],
    played: [],
    turn: 0,
    goes: [false, false] as [boolean, boolean],
    lastPlayer: null,
    scores: [0, 0] as [number, number],
    target: options.target === '61' ? 61 : 121,
    show: [],
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1);
}

function peg(s: CribbageState, p: number, pts: number): CribbageState {
  if (!pts || s.phase === 'matchOver') return s;
  const scores: [number, number] = [...s.scores];
  scores[p] = scores[p]! + pts;
  return {
    ...s,
    scores,
    ...(scores[p]! >= s.target ? { phase: 'matchOver' as const, log: `${name(s, p)} ${p === HUMAN ? 'peg' : 'pegs'} out!` } : {}),
  };
}

/** Two cards to throw: keep the four that score best, counting the crib for or against. */
export function chooseDiscard(hand: readonly StandardCard[], ownCrib: boolean, level: CpuLevel): StandardCard[] {
  let best: StandardCard[] = [hand[0]!, hand[1]!],
    bestV = -Infinity;
  const starters = level === 'hard' ? createStandardDeck().filter((c) => !hand.some((h) => h.id === c.id)) : [];
  for (let i = 0; i < hand.length; i++)
    for (let j = i + 1; j < hand.length; j++) {
      const keep = hand.filter((_, k) => k !== i && k !== j);
      const toss = [hand[i]!, hand[j]!];
      let v: number;
      if (starters.length) v = starters.reduce((n, st) => n + scoreCribbageHand(keep, st).total, 0) / starters.length;
      else v = scoreCribbageHand(keep, null).total;
      const tossValue =
        (toss[0]!.rank === toss[1]!.rank ? 2 : 0) +
        (countValue(toss[0]!) + countValue(toss[1]!) === 15 ? 2 : 0) +
        (toss.some((c) => c.rank === 5) ? 1 : 0);
      v += ownCrib ? tossValue : -tossValue;
      if (v > bestV) [best, bestV] = [toss, v];
    }
  return best;
}

const canPlayAny = (s: CribbageState, p: number) => s.hands[p]!.some((c) => count(s) + countValue(c) <= 31);

/** After a play or a go: who plays next, and whether the count resets. */
function advance(s: CribbageState, from: number): CribbageState {
  const other = 1 - from;
  const bothOut = !s.hands[0].length && !s.hands[1].length;
  if (bothOut) {
    // Last card scores 1 (unless it made 31, which already scored).
    const next =
      count(s) === 31 ? s : peg({ ...s, log: `${s.log} Last card: +1 to ${name(s, s.lastPlayer!)}.` }, s.lastPlayer!, 1);
    return next.phase === 'matchOver' ? next : toShow(next);
  }
  if (count(s) === 31) return { ...s, pile: [], goes: [false, false], turn: s.hands[other]!.length ? other : from };
  if (canPlayAny(s, other) && !s.goes[other]) return { ...s, turn: other };
  if (canPlayAny(s, from)) return { ...s, turn: from };
  // Neither can play: a go point to whoever played last, then the count starts again.
  const lp = s.lastPlayer!;
  const scored = peg({ ...s, log: `${s.log} Go: +1 to ${name(s, lp)}.` }, lp, 1);
  if (scored.phase === 'matchOver') return scored;
  const start = scored.hands[1 - lp]!.length ? 1 - lp : lp;
  return { ...scored, pile: [], goes: [false, false], turn: start };
}

function toShow(s: CribbageState): CribbageState {
  const pone = 1 - s.dealer;
  const lines: ShowLine[] = [];
  let next: CribbageState = s;
  for (const [p, cards, crib] of [
    [pone, s.kept[pone]!, false],
    [s.dealer, s.kept[s.dealer]!, false],
    [s.dealer, s.crib, true],
  ] as const) {
    const r = scoreCribbageHand(cards, s.starter!, crib);
    lines.push({ who: `${name(s, p)}${crib ? ' (crib)' : ''}`, cards: [...cards], items: r.items, total: r.total });
    next = peg(next, p, r.total);
    if (next.phase === 'matchOver') return { ...next, show: lines };
  }
  return { ...next, phase: 'show', show: lines, log: 'The show: hands counted with the starter.' };
}

function reduce(s: CribbageState, a: CribbageAction): CribbageState {
  switch (a.type) {
    case 'discard': {
      if (s.phase !== 'discard' || a.ids.length !== 2) return s;
      const mine = s.hands[HUMAN].filter((c) => a.ids.includes(c.id));
      if (mine.length !== 2) return s;
      const theirs = chooseDiscard(s.hands[CPU], s.dealer === CPU, s.cpu);
      const hands: [StandardCard[], StandardCard[]] = [
        s.hands[HUMAN].filter((c) => !a.ids.includes(c.id)),
        s.hands[CPU].filter((c) => !theirs.includes(c)),
      ];
      const starter = { ...s.stock.at(-1)!, faceUp: true };
      let next: CribbageState = {
        ...s,
        hands,
        kept: [hands[0].slice(), hands[1].map((c) => ({ ...c, faceUp: true }))],
        crib: [...mine, ...theirs].map((c) => ({ ...c, faceUp: true })),
        starter,
        stock: s.stock.slice(0, -1),
        phase: 'peg',
        turn: 1 - s.dealer,
        log: `The starter is the ${cardLabel(starter)}.`,
      };
      if (starter.rank === 11) next = peg({ ...next, log: `${next.log} His heels: +2 to ${name(s, s.dealer)}.` }, s.dealer, 2);
      return next;
    }
    case 'play': {
      if (s.phase !== 'peg' || a.by !== s.turn) return s;
      const card = s.hands[a.by]!.find((c) => c.id === a.id);
      if (!card || count(s) + countValue(card) > 31) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = hands[a.by]!.filter((c) => c.id !== a.id);
      const pile = [...s.pile, { ...card, faceUp: true }];
      const items = peggingPoints(pile);
      const pts = items.reduce((n, i) => n + i.points, 0);
      const total = pile.reduce((n, c) => n + countValue(c), 0);
      let next: CribbageState = {
        ...s,
        hands,
        pile,
        played: [...s.played, { ...card, faceUp: true }],
        lastPlayer: a.by,
        log: `${name(s, a.by)} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)} — ${total}${items.length ? ` (${items.map((i) => `${i.label} +${i.points}`).join(', ')})` : ''}.`,
      };
      next = peg(next, a.by, pts);
      return next.phase === 'matchOver' ? next : advance(next, a.by);
    }
    case 'go': {
      if (s.phase !== 'peg' || a.by !== s.turn || canPlayAny(s, a.by)) return s;
      const goes: [boolean, boolean] = [...s.goes];
      goes[a.by] = true;
      return advance({ ...s, goes, log: `${name(s, a.by)} ${a.by === HUMAN ? 'say' : 'says'} "Go".` }, a.by);
    }
    case 'next':
      return s.phase === 'show' ? deal(s, 1 - s.dealer) : s;
  }
}

/** Pegging choice: grab points now, avoid leaving 5 or 21 for the opponent. */
export function cpuPlay(s: CribbageState, p: number, level: CpuLevel = s.cpu): CribbageAction {
  const options = s.hands[p]!.filter((c) => count(s) + countValue(c) <= 31);
  if (!options.length) return { type: 'go', by: p };
  if (level === 'easy' && chance(`${s.seed}${s.played.length}`) < 0.4) return { type: 'play', by: p, id: options[0]!.id };
  const value = (c: StandardCard) => {
    const pile = [...s.pile, c];
    const total = count(s) + countValue(c);
    let v = peggingPoints(pile).reduce((n, i) => n + i.points, 0) * 10;
    if (total === 5 || total === 21) v -= 6;
    if (!s.pile.length && c.rank === 5) v -= 4;
    return v + countValue(c) * 0.1;
  };
  return { type: 'play', by: p, id: options.reduce((a, b) => (value(b) > value(a) ? b : a)).id };
}

function hint(s: CribbageState): Hint | null {
  if (s.phase === 'discard')
    return {
      cards: chooseDiscard(s.hands[HUMAN], s.dealer === HUMAN, 'hard').map((c) => c.id),
      message: 'Keep the four that score best.',
    };
  if (s.phase === 'peg' && s.turn === HUMAN) {
    const a = cpuPlay(s, HUMAN, 'hard');
    return a.type === 'play' ? { cards: [a.id] } : { message: 'Nothing fits under 31 — say Go.' };
  }
  return null;
}

export const cribbageRules: GameRules<CribbageState, CribbageAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[0] > s.scores[1] ? 'won' : 'lost'),
  auto: (s) =>
    s.phase === 'peg' && s.turn === CPU ? { action: cpuPlay(s, CPU), delayMs: 420 + tempo(s.seat.personality, s.cpu) } : null,
  score: (s) => s.scores[0],
  summary: (s) => `You ${s.scores[0]} – ${s.scores[1]} ${s.seat.name} (to ${s.target}).`,
};
