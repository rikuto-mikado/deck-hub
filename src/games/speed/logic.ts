import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { isAdjacentRank, isRed } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';
import { readLevel, type CpuLevel } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
const FIELD = 4;

export interface SpeedState {
  stocks: [StandardCard[], StandardCard[]];
  fields: [(StandardCard | null)[], (StandardCard | null)[]];
  center: [StandardCard[], StandardCard[]];
  seed: number;
  moves: number;
  log: string;
  /** CPU reaction time in ms: base plus up to `spread` more. */
  cpu: { base: number; spread: number };
}

const REACTION: Record<CpuLevel, { base: number; spread: number }> = {
  easy: { base: 1600, spread: 1100 },
  normal: { base: 900, spread: 900 },
  hard: { base: 500, spread: 450 },
};

export type SpeedAction =
  | { type: 'play'; by: number; slot: number; pile: number }
  /** Nobody can move: each player turns a stock card onto a center pile. */
  | { type: 'stall' };

export function canPlay(s: SpeedState, by: number, slot: number, pile: number): boolean {
  const card = s.fields[by]?.[slot];
  const top = s.center[pile]?.at(-1);
  return !!card && !!top && isAdjacentRank(card, top, true);
}

export function movesFor(s: SpeedState, by: number): { slot: number; pile: number }[] {
  const out: { slot: number; pile: number }[] = [];
  for (let slot = 0; slot < FIELD; slot++)
    for (let pile = 0; pile < 2; pile++) if (canPlay(s, by, slot, pile)) out.push({ slot, pile });
  return out;
}

const cardsLeft = (s: SpeedState, p: number) => s.stocks[p]!.length + s.fields[p]!.filter(Boolean).length;

function refill(stock: StandardCard[], field: (StandardCard | null)[]) {
  const st = stock.slice();
  const f = field.map((c) => c ?? (st.length ? { ...st.pop()!, faceUp: true } : null));
  return { stock: st, field: f };
}

export function setup(rng: Rng, options: RuleOptions = {}): SpeedState {
  const deck = shuffle(createStandardDeck(), rng);
  const mine = deck.filter(isRed),
    theirs = deck.filter((c) => !isRed(c));
  const h = refill(mine, Array(FIELD).fill(null));
  const c = refill(theirs, Array(FIELD).fill(null));
  const s: SpeedState = {
    stocks: [h.stock, c.stock],
    fields: [h.field, c.field],
    center: [[], []],
    seed: nextSeed(rng),
    moves: 0,
    log: 'Go!',
    cpu: REACTION[readLevel(options)],
  };
  return stall(s, 'Go!');
}

function stall(s: SpeedState, log: string): SpeedState {
  const stocks: [StandardCard[], StandardCard[]] = [s.stocks[0].slice(), s.stocks[1].slice()];
  const center: [StandardCard[], StandardCard[]] = [s.center[0].slice(), s.center[1].slice()];
  for (const p of [0, 1] as const) {
    // Each player feeds their own pile; if their stock is empty, the opponent's stock is used.
    const src = stocks[p].length ? stocks[p] : stocks[1 - p]!;
    const card = src.pop();
    if (card) center[p].push({ ...card, faceUp: true });
  }
  return { ...s, stocks, center, log };
}

function reduce(s: SpeedState, a: SpeedAction): SpeedState {
  if (a.type === 'stall') {
    if (movesFor(s, HUMAN).length || movesFor(s, CPU).length) return s;
    if (!s.stocks[0].length && !s.stocks[1].length) return s;
    return { ...stall(s, 'Speed!'), moves: s.moves + 1 };
  }
  if (!canPlay(s, a.by, a.slot, a.pile)) return s;
  const card = s.fields[a.by]![a.slot]!;
  const fields: SpeedState['fields'] = [s.fields[0].slice(), s.fields[1].slice()];
  fields[a.by as 0 | 1][a.slot] = null;
  const r = refill(s.stocks[a.by]!, fields[a.by]!);
  const stocks: SpeedState['stocks'] = [s.stocks[0], s.stocks[1]];
  stocks[a.by as 0 | 1] = r.stock;
  fields[a.by as 0 | 1] = r.field;
  const center: SpeedState['center'] = [s.center[0], s.center[1]];
  center[a.pile as 0 | 1] = [...center[a.pile]!, card];
  return { ...s, stocks, fields, center, moves: s.moves + 1, log: '' };
}

/** Both stuck with no stock to flip: fewer cards left wins. */
const deadlocked = (s: SpeedState) =>
  !movesFor(s, HUMAN).length && !movesFor(s, CPU).length && !s.stocks[0].length && !s.stocks[1].length;

export const speedRules: GameRules<SpeedState, SpeedAction> = {
  setup,
  reduce,
  status: (s) => {
    if (cardsLeft(s, HUMAN) === 0) return 'won';
    if (cardsLeft(s, CPU) === 0) return 'lost';
    if (deadlocked(s)) return cardsLeft(s, HUMAN) < cardsLeft(s, CPU) ? 'won' : 'lost';
    return 'playing';
  },
  auto: (s) => {
    const cpu = movesFor(s, CPU);
    if (cpu.length) {
      const rng = createRng(s.seed ^ (s.moves * 2654435761));
      const pick = cpu[rng.int(cpu.length)]!;
      return { action: { type: 'play', by: CPU, ...pick }, delayMs: s.cpu.base + rng.int(s.cpu.spread) };
    }
    if (!movesFor(s, HUMAN).length && (s.stocks[0].length || s.stocks[1].length))
      return { action: { type: 'stall' }, delayMs: 1100 };
    return null;
  },
  score: (s) => cardsLeft(s, HUMAN),
  summary: (s) => `You ${cardsLeft(s, HUMAN)} left · CPU ${cardsLeft(s, CPU)} left`,
};
