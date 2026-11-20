import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;

/** K 0, A 1, 2 −2, 3–10 face value, J/Q 10. */
export const golfValue = (c: StandardCard) => (c.rank === 13 ? 0 : c.rank === 2 ? -2 : c.rank >= 11 ? 10 : c.rank);

export interface SixGolfState {
  seats: CpuSeat[];
  players: number;
  /** Each grid has 6 cards: indexes 0–2 the top row, 3–5 the bottom row; columns are i and i + 3. */
  grids: StandardCard[][];
  stock: StandardCard[];
  discard: StandardCard[];
  /** Card drawn and not yet placed. */
  drawn: StandardCard | null;
  /** The drawn card came from the discard pile (it must then be swapped in). */
  fromDiscard: boolean;
  phase: 'reveal' | 'play' | 'holeOver' | 'matchOver';
  turn: number;
  /** Player who turned up their last card; everyone else gets one more turn. */
  closer: number | null;
  /** Has `turn` taken a drawn card and discarded it, and must now flip one? */
  mustFlip: boolean;
  hole: number;
  holes: number;
  totals: number[];
  lastHole: number[] | null;
  dealer: number;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type SixGolfAction =
  | { type: 'reveal'; cells: [number, number] }
  | { type: 'draw'; by: number; from: 'stock' | 'discard' }
  | { type: 'swap'; by: number; cell: number }
  | { type: 'toss'; by: number }
  | { type: 'flip'; by: number; cell: number }
  | { type: 'next' };

/** Score of a grid: matching ranks in a column cancel to zero. */
export function gridScore(grid: readonly StandardCard[], all = true): number {
  let total = 0;
  for (let col = 0; col < 3; col++) {
    const a = grid[col]!,
      b = grid[col + 3]!;
    const known = (c: StandardCard) => all || c.faceUp;
    if (known(a) && known(b) && a.rank === b.rank) continue;
    if (known(a)) total += golfValue(a);
    if (known(b)) total += golfValue(b);
  }
  return total;
}

const allUp = (g: readonly StandardCard[]) => g.every((c) => c.faceUp);

function deal(s: SixGolfState, hole: number, dealer: number): SixGolfState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const grids = Array.from({ length: s.players }, () => deck.splice(-6));
  // CPUs turn up two cards of their own choosing (here: one per column, for information).
  const shown = grids.map((g, p) => (p === HUMAN ? g : g.map((c, i) => (i === 0 || i === 4 ? { ...c, faceUp: true } : c))));
  const first = (dealer + 1) % s.players;
  return {
    ...s,
    grids: shown,
    stock: deck.slice(0, -1),
    discard: [{ ...deck.at(-1)!, faceUp: true }],
    drawn: null,
    fromDiscard: false,
    phase: 'reveal',
    turn: first,
    closer: null,
    mustFlip: false,
    hole,
    dealer,
    seed: nextSeed(rng),
    log: `Hole ${hole}: turn up any two of your cards.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): SixGolfState {
  const players = options.players === '2' ? 2 : options.players === '3' ? 3 : 4;
  const seed = nextSeed(rng);
  const base = {
    seats: drawSeats(rng, players - 1),
    players,
    grids: [],
    stock: [],
    discard: [],
    drawn: null,
    fromDiscard: false,
    phase: 'reveal' as const,
    turn: 0,
    closer: null,
    mustFlip: false,
    hole: 1,
    holes: Number(options.holes ?? '5') || 5,
    totals: Array<number>(players).fill(0),
    lastHole: null,
    dealer: players - 1,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1, players - 1);
}

function endTurn(s: SixGolfState, p: number, log: string): SixGolfState {
  let closer = s.closer;
  if (closer === null && allUp(s.grids[p]!)) {
    closer = p;
    log += ` ${seatName(s.seats, p)} ${p === HUMAN ? 'have' : 'has'} turned every card — one last turn each!`;
  }
  const next = (p + 1) % s.players;
  if (closer !== null && next === closer) {
    // Hole over: turn everything up and score it.
    const grids = s.grids.map((g) => g.map((c) => ({ ...c, faceUp: true })));
    const scores = grids.map((g) => gridScore(g));
    const totals = s.totals.map((t, i) => t + scores[i]!);
    return {
      ...s,
      grids,
      totals,
      lastHole: scores,
      closer,
      drawn: null,
      mustFlip: false,
      phase: s.hole >= s.holes ? 'matchOver' : 'holeOver',
      log: `${log} Hole ${s.hole} is over.`,
    };
  }
  return { ...s, closer, turn: next, drawn: null, fromDiscard: false, mustFlip: false, log };
}

const place = (grids: StandardCard[][], p: number, cell: number, card: StandardCard) =>
  grids.map((g, i) => (i === p ? g.map((c, j) => (j === cell ? { ...card, faceUp: true } : c)) : g));

function reduce(s: SixGolfState, a: SixGolfAction): SixGolfState {
  if (a.type === 'next') return s.phase === 'holeOver' ? deal(s, s.hole + 1, (s.dealer + 1) % s.players) : s;
  if (a.type === 'reveal') {
    const [x, y] = a.cells;
    if (s.phase !== 'reveal' || x === y || x < 0 || y < 0 || x > 5 || y > 5) return s;
    const grids = s.grids.map((g, p) => (p === HUMAN ? g.map((c, i) => (i === x || i === y ? { ...c, faceUp: true } : c)) : g));
    return { ...s, grids, phase: 'play', log: `${seatName(s.seats, s.turn)} ${s.turn === HUMAN ? 'start' : 'starts'}.` };
  }
  if (s.phase !== 'play' || a.by !== s.turn) return s;
  const who = seatName(s.seats, a.by);
  switch (a.type) {
    case 'draw': {
      if (s.drawn || s.mustFlip) return s;
      if (a.from === 'discard') {
        const card = s.discard.at(-1);
        return card
          ? {
              ...s,
              discard: s.discard.slice(0, -1),
              drawn: card,
              fromDiscard: true,
              log: `${who} ${a.by === HUMAN ? 'take' : 'takes'} the ${cardLabel(card)}.`,
            }
          : s;
      }
      let stock = s.stock,
        discard = s.discard;
      if (!stock.length) {
        const rng = createRng(s.seed);
        stock = shuffle(discard.slice(0, -1), rng).map((c) => ({ ...c, faceUp: false }));
        discard = discard.slice(-1);
      }
      const card = stock.at(-1);
      if (!card) return s;
      return {
        ...s,
        stock: stock.slice(0, -1),
        discard,
        drawn: { ...card, faceUp: true },
        fromDiscard: false,
        seed: s.seed + 1,
        log: `${who} ${a.by === HUMAN ? 'draw' : 'draws'} ${a.by === HUMAN ? `the ${cardLabel(card)}` : 'a card'}.`,
      };
    }
    case 'swap': {
      if (!s.drawn || a.cell < 0 || a.cell > 5) return s;
      const old = s.grids[a.by]![a.cell]!;
      const grids = place(s.grids, a.by, a.cell, s.drawn);
      return endTurn(
        { ...s, grids, discard: [...s.discard, { ...old, faceUp: true }] },
        a.by,
        `${who} ${a.by === HUMAN ? 'swap' : 'swaps'} in the ${cardLabel(s.drawn)}.`,
      );
    }
    case 'toss': {
      // Only a stock card may be thrown away; afterwards a face-down card must be turned (if any).
      if (!s.drawn || s.fromDiscard) return s;
      const next = { ...s, discard: [...s.discard, s.drawn], drawn: null };
      if (allUp(s.grids[a.by]!)) return endTurn(next, a.by, `${who} ${a.by === HUMAN ? 'discard' : 'discards'} it.`);
      return { ...next, mustFlip: true, log: `${who} ${a.by === HUMAN ? 'discard' : 'discards'} it and must turn a card.` };
    }
    case 'flip': {
      const card = s.grids[a.by]![a.cell];
      if (!s.mustFlip || !card || card.faceUp) return s;
      const grids = s.grids.map((g, i) => (i === a.by ? g.map((c, j) => (j === a.cell ? { ...c, faceUp: true } : c)) : g));
      return endTurn({ ...s, grids }, a.by, `${who} ${a.by === HUMAN ? 'turn' : 'turns'} up the ${cardLabel(card)}.`);
    }
  }
}

/** Expected value of the face-down cards in a grid. */
const unknown = (g: readonly StandardCard[]) => g.filter((c) => !c.faceUp).length * 4.5;

/** Value a card would add in `cell`, counting a column match. */
function gain(grid: readonly StandardCard[], cell: number, card: StandardCard): number {
  const after = grid.map((c, i) => (i === cell ? { ...card, faceUp: true } : c));
  return gridScore(grid, false) + unknown(grid) - (gridScore(after, false) + unknown(after));
}

export function cpuMove(s: SixGolfState, p: number, level: CpuLevel = s.cpu): SixGolfAction {
  const grid = s.grids[p]!;
  const risk = TRAITS[personalityOf(s.seats, p)].risk;
  const bestCell = (card: StandardCard) =>
    [0, 1, 2, 3, 4, 5].reduce((a, b) => (gain(grid, b, card) > gain(grid, a, card) ? b : a));
  if (s.mustFlip) return { type: 'flip', by: p, cell: grid.findIndex((c) => !c.faceUp) };
  if (s.drawn) {
    const cell = bestCell(s.drawn);
    const g = gain(grid, cell, s.drawn);
    const fromDiscard = s.fromDiscard;
    // Don't turn your last card while trailing badly, unless bold.
    const closing = grid.filter((c) => !c.faceUp).length === 1 && !grid[cell]!.faceUp;
    const behind = gridScore(grid, false) > 12 && risk < 0.5 && level !== 'easy';
    if ((g > 0.5 && !(closing && behind)) || fromDiscard) return { type: 'swap', by: p, cell };
    return { type: 'toss', by: p };
  }
  const top = s.discard.at(-1);
  if (top && gain(grid, bestCell(top), top) > (level === 'easy' ? 6 : 2.5)) return { type: 'draw', by: p, from: 'discard' };
  if (level === 'easy' && top && chance(`${s.seed}${p}`) < 0.2) return { type: 'draw', by: p, from: 'discard' };
  return { type: 'draw', by: p, from: 'stock' };
}

export const sixGolfRules: GameRules<SixGolfState, SixGolfAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.phase === 'reveal') return { message: 'Turn up one card in two different columns.' };
    if (s.phase !== 'play' || s.turn !== HUMAN) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type === 'swap' || a.type === 'flip') return { cards: [s.grids[HUMAN]![a.cell]!.id] };
    if (a.type === 'draw') return { message: a.from === 'discard' ? 'Take the discard.' : 'Draw from the stock.' };
    return { message: 'Discard the drawn card.' };
  },
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.totals[HUMAN]! <= Math.min(...s.totals) ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase !== 'play' || s.turn === HUMAN) return null;
    const action = cpuMove(s, s.turn);
    return { action, delayMs: 260 + tempo(personalityOf(s.seats, s.turn), s.cpu, false, `${s.stock.length}`) };
  },
  score: (s) => s.totals[HUMAN]!,
  summary: (s) => s.totals.map((t, p) => `${seatName(s.seats, p)} ${t}`).join(' · ') + ' (lowest wins)',
};
