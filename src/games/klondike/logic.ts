import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { fitsFoundation, isAlternatingRun, sameColor } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

/** 'waste' | 'f0'…'f3' | 't0'…'t6' */
export type PileId = string;

export type Scoring = 'standard' | 'vegas';

export interface KlondikeState {
  stock: StandardCard[];
  waste: StandardCard[];
  foundations: StandardCard[][];
  tableau: StandardCard[][];
  moves: number;
  /** Cards turned from the stock at a time (1 or 3). */
  draw: number;
  /** Passes through the stock allowed; 0 = unlimited. */
  maxPasses: number;
  pass: number;
  scoring: Scoring;
  score: number;
}

export type KlondikeAction = { type: 'draw' } | { type: 'move'; from: PileId; index: number; to: PileId };

export function setup(rng: Rng, options: RuleOptions = {}): KlondikeState {
  const scoring: Scoring = options.scoring === 'vegas' ? 'vegas' : 'standard';
  const deck = shuffle(createStandardDeck(), rng);
  let k = 0;
  const tableau = Array.from({ length: 7 }, (_, i) =>
    Array.from({ length: i + 1 }, (_slot, j) => ({ ...deck[k++]!, faceUp: j === i })),
  );
  return {
    stock: deck.slice(k),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    draw: options.draw === '3' ? 3 : 1,
    maxPasses: options.passes === '1' ? 1 : options.passes === '3' ? 3 : 0,
    pass: 1,
    scoring,
    // Vegas: you "buy" the deck for 52 and earn 5 per card on the foundations.
    score: scoring === 'vegas' ? -52 : 0,
  };
}

export function getPile(s: KlondikeState, id: PileId): StandardCard[] | undefined {
  if (id === 'waste') return s.waste;
  const n = Number(id.slice(1));
  if (id[0] === 'f') return s.foundations[n];
  if (id[0] === 't') return s.tableau[n];
  return undefined;
}

function setPile(s: KlondikeState, id: PileId, cards: StandardCard[]): KlondikeState {
  if (id === 'waste') return { ...s, waste: cards };
  const n = Number(id.slice(1));
  if (id[0] === 'f') return { ...s, foundations: s.foundations.map((p, i) => (i === n ? cards : p)) };
  return { ...s, tableau: s.tableau.map((p, i) => (i === n ? cards : p)) };
}

export function canMove(s: KlondikeState, from: PileId, index: number, to: PileId): boolean {
  if (from === to || to === 'waste') return false;
  const src = getPile(s, from),
    dst = getPile(s, to);
  if (!src || !dst || index < 0 || index >= src.length) return false;
  const moving = src.slice(index);
  if (from !== 'waste' && from[0] !== 't' && moving.length !== 1) return false;
  if (from === 'waste' && index !== src.length - 1) return false;
  if (to[0] === 't' && from[0] === 'f' && moving.length !== 1) return false;
  if (!isAlternatingRun(moving)) return false;
  const head = moving[0]!;
  if (to[0] === 'f') return moving.length === 1 && fitsFoundation(head, dst);
  const top = dst.at(-1);
  return top ? top.faceUp && top.rank === head.rank + 1 && !sameColor(top, head) : head.rank === 13;
}

const onFoundations = (s: KlondikeState) => s.foundations.reduce((n, f) => n + f.length, 0);

const TARGETS = ['f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];

/** Destination for a tap: foundation first, then a non-empty column, then an empty one. */
export function bestTarget(s: KlondikeState, from: PileId, index: number): PileId | null {
  const legal = TARGETS.filter((t) => canMove(s, from, index, t));
  return legal.find((t) => t[0] === 'f') ?? legal.find((t) => getPile(s, t)!.length) ?? legal[0] ?? null;
}

export const canRecycle = (s: KlondikeState) =>
  !s.stock.length && s.waste.length > 0 && (s.maxPasses === 0 || s.pass < s.maxPasses);

/** Points for a move under Standard (Windows) or Vegas scoring. */
function moveScore(s: KlondikeState, from: PileId, to: PileId, flipped: boolean): number {
  if (s.scoring === 'vegas') return to[0] === 'f' ? 5 : from[0] === 'f' ? -5 : 0;
  let pts = 0;
  if (from === 'waste' && to[0] === 't') pts += 5;
  if (to[0] === 'f' && from[0] !== 'f') pts += 10;
  if (from[0] === 'f' && to[0] === 't') pts -= 15;
  if (flipped) pts += 5;
  return pts;
}

function reduce(s: KlondikeState, a: KlondikeAction): KlondikeState {
  if (a.type === 'draw') {
    if (!s.stock.length) {
      if (!canRecycle(s)) return s;
      // Standard scoring charges for going through the deck again.
      const penalty = s.scoring === 'standard' ? (s.draw === 1 ? 100 : s.pass >= 3 ? 20 : 0) : 0;
      return {
        ...s,
        stock: s.waste.map((c) => ({ ...c, faceUp: false })).toReversed(),
        waste: [],
        pass: s.pass + 1,
        moves: s.moves + 1,
        score: s.scoring === 'standard' ? Math.max(0, s.score - penalty) : s.score,
      };
    }
    const n = Math.min(s.draw, s.stock.length);
    const drawn = s.stock
      .slice(-n)
      .toReversed()
      .map((c) => ({ ...c, faceUp: true }));
    return { ...s, stock: s.stock.slice(0, -n), waste: [...s.waste, ...drawn], moves: s.moves + 1 };
  }
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const src = getPile(s, a.from)!;
  const moving = src.slice(a.index);
  let rest = src.slice(0, a.index);
  const last = rest.at(-1);
  const flipped = a.from[0] === 't' && !!last && !last.faceUp;
  if (flipped) rest = [...rest.slice(0, -1), { ...last!, faceUp: true }];
  let next = setPile(s, a.from, rest);
  next = setPile(next, a.to, [...getPile(next, a.to)!, ...moving]);
  const score = s.score + moveScore(s, a.from, a.to, flipped);
  return { ...next, moves: s.moves + 1, score: s.scoring === 'standard' ? Math.max(0, score) : score };
}

/** Once everything is face up and the stock is empty, the game plays itself out. */
function autoFinish(s: KlondikeState): KlondikeAction | null {
  if (s.stock.length || s.waste.length || s.tableau.some((t) => t.some((c) => !c.faceUp))) return null;
  for (let i = 0; i < 7; i++) {
    const t = s.tableau[i]!;
    if (!t.length) continue;
    for (let f = 0; f < 4; f++) {
      if (canMove(s, `t${i}`, t.length - 1, `f${f}`)) return { type: 'move', from: `t${i}`, index: t.length - 1, to: `f${f}` };
    }
  }
  return null;
}

interface Move {
  from: PileId;
  index: number;
  to: PileId;
  /** Higher is better; 0 means legal but pointless (e.g. shuffling a run back and forth). */
  value: number;
}

/** Every legal move, ranked by how much progress it makes. */
export function rankedMoves(s: KlondikeState): Move[] {
  const out: Move[] = [];
  const sources: [PileId, number][] = [];
  if (s.waste.length) sources.push(['waste', s.waste.length - 1]);
  s.tableau.forEach((t, i) => t.forEach((c, j) => c.faceUp && sources.push([`t${i}`, j])));
  for (const [from, index] of sources) {
    for (const to of TARGETS) {
      if (!canMove(s, from, index, to)) continue;
      const src = getPile(s, from)!;
      const below = src[index - 1];
      let value = 0;
      if (to[0] === 'f') value = 100;
      else if (from === 'waste') value = 60;
      else if (below && !below.faceUp)
        value = 80; // turns a card over
      else if (below && TARGETS.some((f) => f[0] === 'f' && fitsFoundation(below, getPile(s, f)!)))
        value = 50; // frees a card for home
      else if (!below && to[0] === 't' && getPile(s, to)!.length === 0) value = 0; // King from one empty column to another
      out.push({ from, index, to, value });
    }
  }
  return out.toSorted((a, b) => b.value - a.value);
}

function hint(s: KlondikeState) {
  const best = rankedMoves(s).find((m) => m.value > 0);
  if (best) {
    const card = getPile(s, best.from)![best.index]!;
    const target = getPile(s, best.to)!.at(-1);
    return { cards: target ? [card.id, target.id] : [card.id] };
  }
  const top = s.stock.at(-1);
  if (top) return { cards: [top.id], message: 'Turn the stock for a new card.' };
  if (canRecycle(s)) return { message: 'Tap the empty stock to go through the waste again.' };
  return null;
}

/**
 * Stuck: no useful move on the table, and no card in the stock or waste can be placed now.
 * Going through the stock never changes the tableau, so nothing will ever open up.
 */
function stuck(s: KlondikeState): boolean {
  if (onFoundations(s) === 52 || rankedMoves(s).some((m) => m.value > 0)) return false;
  const reachable = [...s.stock, ...s.waste];
  if (!reachable.length) return true;
  if (s.maxPasses && s.pass >= s.maxPasses && !s.stock.length) return true;
  return !reachable.some((c) => {
    const card = { ...c, faceUp: true };
    return (
      s.foundations.some((f) => fitsFoundation(card, f)) ||
      s.tableau.some((t) => {
        const top = t.at(-1);
        return top ? top.faceUp && top.rank === card.rank + 1 && !sameColor(top, card) : card.rank === 13;
      })
    );
  });
}

export const klondikeRules: GameRules<KlondikeState, KlondikeAction> = {
  hint,
  stuck,
  setup,
  reduce,
  status: (s) => (onFoundations(s) === 52 ? 'won' : 'playing'),
  auto: (s) => {
    const action = autoFinish(s);
    return action ? { action, delayMs: 110 } : null;
  },
  score: (s) => s.score,
  summary: (s) => `Solved in ${s.moves} moves · ${s.scoring === 'vegas' ? `$${s.score}` : `${s.score} points`}`,
};
