import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh } from '@/core/rules/trickTaking';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';
import { drawSeats, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
/** Short game: first to this many cards, or most cards after SHORT_ROUNDS battles. */
export const SHORT_TARGET = 35;
export const SHORT_ROUNDS = 20;
/** Classic games are stopped here so a looping deal can't run forever. */
const CLASSIC_CAP = 600;

export interface WarState {
  /** Face-down stacks; the end of the array is the top. */
  stacks: [StandardCard[], StandardCard[]];
  /** Cards each player has put into the current battle (last one face up). */
  table: [StandardCard[], StandardCard[]];
  phase: 'ready' | 'war' | 'collect';
  /** Player who takes the table on `collect`. */
  winner: number | null;
  rounds: number;
  wars: number;
  mode: 'short' | 'classic';
  /** Cards each side puts face down in a war (1–3). */
  warCards: number;
  seat: CpuSeat;
  log: string;
}

export type WarAction = { type: 'flip' } | { type: 'collect' };

export function setup(rng: Rng, options: RuleOptions = {}): WarState {
  const deck = shuffle(createStandardDeck(), rng);
  const [seat] = drawSeats(rng, 1);
  return {
    stacks: [deck.slice(0, 26), deck.slice(26)],
    table: [[], []],
    phase: 'ready',
    winner: null,
    rounds: 0,
    wars: 0,
    mode: options.length === 'classic' ? 'classic' : 'short',
    warCards: Math.min(3, Math.max(1, Number(options.warCards ?? '3') || 3)),
    seat: seat!,
    log: `Flip your top card against ${seat!.name}.`,
  };
}

const count = (s: WarState, p: number) => s.stacks[p]!.length + s.table[p]!.length;
const top = (s: WarState, p: number) => s.table[p]!.at(-1)!;

function flip(s: WarState): WarState {
  const war = s.phase === 'war';
  const stacks: [StandardCard[], StandardCard[]] = [s.stacks[0].slice(), s.stacks[1].slice()];
  const table: [StandardCard[], StandardCard[]] = [s.table[0].slice(), s.table[1].slice()];
  for (const p of [HUMAN, CPU]) {
    // In a war, keep one card back to fight with; someone short on cards fights with what they have.
    const down = war ? Math.min(s.warCards, stacks[p]!.length - 1) : 0;
    for (let i = 0; i < down; i++) table[p]!.push({ ...stacks[p]!.pop()!, faceUp: false });
    const card = stacks[p]!.pop();
    if (card) table[p]!.push({ ...card, faceUp: true });
  }
  const next: WarState = { ...s, stacks, table, rounds: war ? s.rounds : s.rounds + 1 };
  const a = table[HUMAN].at(-1),
    b = table[CPU].at(-1);
  if (!a || !b) return { ...next, phase: 'collect', winner: a ? HUMAN : CPU, log: 'Out of cards!' };
  const d = aceHigh(a) - aceHigh(b);
  if (d === 0) {
    // A tie with no cards left to fight on: whoever still has cards takes the pile.
    if (!stacks[HUMAN].length || !stacks[CPU].length) {
      const w = stacks[HUMAN].length >= stacks[CPU].length ? HUMAN : CPU;
      return { ...next, phase: 'collect', winner: w, log: 'A tie with nothing left to fight with!' };
    }
    return { ...next, phase: 'war', wars: s.wars + 1, log: 'WAR! Flip again to fight it out.' };
  }
  const w = d > 0 ? HUMAN : CPU;
  const pot = table[0].length + table[1].length;
  return {
    ...next,
    phase: 'collect',
    winner: w,
    log: w === HUMAN ? `You take ${pot} cards.` : `${s.seat.name} takes ${pot} cards.`,
  };
}

function reduce(s: WarState, a: WarAction): WarState {
  if (a.type === 'flip') return s.phase === 'collect' || over(s) ? s : flip(s);
  if (s.phase !== 'collect' || s.winner === null) return s;
  // Winnings go face down under the winner's stack: their own battle card first, then the other's.
  const w = s.winner;
  const won = [...s.table[w]!, ...s.table[1 - w]!].map((c) => ({ ...c, faceUp: false })).toReversed();
  const stacks: [StandardCard[], StandardCard[]] = [s.stacks[0], s.stacks[1]];
  stacks[w] = [...won, ...stacks[w]!];
  return { ...s, stacks, table: [[], []], phase: 'ready', winner: null };
}

function over(s: WarState): boolean {
  if (s.phase !== 'ready') return false;
  if (!count(s, HUMAN) || !count(s, CPU)) return true;
  if (s.mode === 'short') return count(s, HUMAN) >= SHORT_TARGET || count(s, CPU) >= SHORT_TARGET || s.rounds >= SHORT_ROUNDS;
  return s.rounds >= CLASSIC_CAP;
}

export const warRules: GameRules<WarState, WarAction> = {
  setup,
  reduce,
  status: (s) => (!over(s) ? 'playing' : count(s, HUMAN) > count(s, CPU) ? 'won' : 'lost'),
  auto: (s) => (s.phase === 'collect' && !over(s) ? { action: { type: 'collect' }, delayMs: s.wars ? 900 : 650 } : null),
  score: (s) => count(s, HUMAN),
  summary: (s) => `You ${count(s, HUMAN)} – ${count(s, CPU)} ${s.seat.name} after ${s.rounds} battles (${s.wars} wars).`,
};

export { count as cardsOf, top as battleCard };
