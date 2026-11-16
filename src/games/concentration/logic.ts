import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';
import { readLevel, type CpuLevel } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
/** Chance the CPU recalls a card it has seen, by strength. */
const MEMORY: Record<CpuLevel, number> = { easy: 0.35, normal: 0.7, hard: 0.95 };

export interface ConcentrationState {
  cards: StandardCard[];
  /** Who took each card's pair, or null while still on the table. */
  owner: (number | null)[];
  /** Cards ever revealed (the CPU's memory is drawn from these). */
  seen: boolean[];
  flipped: number[];
  turn: number;
  pairs: [number, number];
  seed: number;
  moves: number;
  memory: number;
}

export type ConcentrationAction = { type: 'flip'; by: number; index: number } | { type: 'resolve' };

export function setup(rng: Rng, options: RuleOptions = {}): ConcentrationState {
  const cards = shuffle(createStandardDeck(), rng);
  return {
    cards,
    owner: cards.map(() => null),
    seen: cards.map(() => false),
    flipped: [],
    turn: HUMAN,
    pairs: [0, 0],
    seed: nextSeed(rng),
    moves: 0,
    memory: MEMORY[readLevel(options)],
  };
}

const isOpen = (s: ConcentrationState, i: number) => s.owner[i] === null && !s.flipped.includes(i);

function reduce(s: ConcentrationState, a: ConcentrationAction): ConcentrationState {
  if (a.type === 'flip') {
    if (a.by !== s.turn || s.flipped.length >= 2 || !isOpen(s, a.index)) return s;
    const cards = s.cards.map((c, i) => (i === a.index ? { ...c, faceUp: true } : c));
    const seen = s.seen.map((v, i) => v || i === a.index);
    return { ...s, cards, seen, flipped: [...s.flipped, a.index] };
  }
  if (s.flipped.length !== 2) return s;
  const [x, y] = s.flipped as [number, number];
  const match = s.cards[x]!.rank === s.cards[y]!.rank;
  if (match) {
    const pairs: [number, number] = [...s.pairs];
    pairs[s.turn]!++;
    return { ...s, owner: s.owner.map((o, i) => (i === x || i === y ? s.turn : o)), flipped: [], pairs, moves: s.moves + 1 };
  }
  return {
    ...s,
    cards: s.cards.map((c, i) => (i === x || i === y ? { ...c, faceUp: false } : c)),
    flipped: [],
    turn: 1 - s.turn,
    moves: s.moves + 1,
  };
}

/** CPU picks from what it remembers, otherwise guesses an unseen card. */
export function cpuPick(s: ConcentrationState): number {
  const rng = createRng(s.seed ^ (s.moves * 7919 + s.flipped.length * 104729));
  const open = s.cards.map((_, i) => i).filter((i) => isOpen(s, i));
  const remembered = open.filter((i) => s.seen[i] && rng.next() < s.memory);
  const first = s.flipped[0];
  if (first !== undefined) {
    const match = remembered.find((i) => s.cards[i]!.rank === s.cards[first]!.rank);
    if (match !== undefined) return match;
  } else {
    for (const i of remembered) {
      const j = remembered.find((k) => k !== i && s.cards[k]!.rank === s.cards[i]!.rank);
      if (j !== undefined) return i;
    }
  }
  const unseen = open.filter((i) => !s.seen[i]);
  const pool = unseen.length ? unseen : open;
  return pool[rng.int(pool.length)]!;
}

const done = (s: ConcentrationState) => s.owner.every((o) => o !== null);

export const concentrationRules: GameRules<ConcentrationState, ConcentrationAction> = {
  setup,
  reduce,
  status: (s) => (!done(s) ? 'playing' : s.pairs[HUMAN] > s.pairs[CPU] ? 'won' : 'lost'),
  auto: (s) => {
    if (s.flipped.length === 2) return { action: { type: 'resolve' }, delayMs: s.turn === HUMAN ? 1000 : 1200 };
    if (s.turn === CPU && !done(s)) return { action: { type: 'flip', by: CPU, index: cpuPick(s) }, delayMs: 700 };
    return null;
  },
  score: (s) => s.pairs[HUMAN],
  summary: (s) => `You ${s.pairs[HUMAN]} – ${s.pairs[CPU]} CPU` + (s.pairs[HUMAN] === s.pairs[CPU] ? ' · Tie game' : ''),
};
