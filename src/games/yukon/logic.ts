import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { fitsFoundation, sameColor } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

/** 'f0'…'f3' foundations, 't0'…'t6' columns. */
export type PileId = string;

export interface YukonState {
  tableau: StandardCard[][];
  foundations: StandardCard[][];
  moves: number;
}

export type YukonAction = { type: 'move'; from: PileId; index: number; to: PileId };

/** Column 1 holds one card; columns 2–7 hold 1…6 face-down cards under five face-up ones. */
export function setup(rng: Rng): YukonState {
  const deck = shuffle(createStandardDeck(), rng);
  let k = 0;
  const tableau = Array.from({ length: 7 }, (_, i) => {
    const down = i,
      upCount = i === 0 ? 1 : 5;
    return Array.from({ length: down + upCount }, (_card, j) => ({ ...deck[k++]!, faceUp: j >= down }));
  });
  return { tableau, foundations: [[], [], [], []], moves: 0 };
}

export function getPile(s: YukonState, id: PileId): StandardCard[] {
  const n = Number(id.slice(1));
  return (id[0] === 'f' ? s.foundations[n] : s.tableau[n]) ?? [];
}

/**
 * Any face-up card may move with everything on top of it, in sequence or not, onto a card one
 * higher of the other colour. Only Kings (with their loads) go into empty columns.
 */
export function canMove(s: YukonState, from: PileId, index: number, to: PileId): boolean {
  if (from === to) return false;
  const src = getPile(s, from);
  const card = src[index];
  if (!card?.faceUp) return false;
  if (from[0] === 'f' && index !== src.length - 1) return false;
  if (to[0] === 'f') return index === src.length - 1 && fitsFoundation(card, getPile(s, to));
  const top = getPile(s, to).at(-1);
  return top ? top.faceUp && top.rank === card.rank + 1 && !sameColor(top, card) : card.rank === 13;
}

const TARGETS = ['f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];

export function bestTarget(s: YukonState, from: PileId, index: number): PileId | null {
  const legal = TARGETS.filter((t) => canMove(s, from, index, t));
  return legal.find((t) => t[0] === 'f') ?? legal.find((t) => getPile(s, t).length) ?? legal[0] ?? null;
}

function withPile(s: YukonState, id: PileId, cards: StandardCard[]): YukonState {
  const n = Number(id.slice(1));
  if (id[0] === 'f') return { ...s, foundations: s.foundations.map((p, i) => (i === n ? cards : p)) };
  return { ...s, tableau: s.tableau.map((p, i) => (i === n ? cards : p)) };
}

function reduce(s: YukonState, a: YukonAction): YukonState {
  if (!canMove(s, a.from, a.index, a.to)) return s;
  const src = getPile(s, a.from);
  let rest = src.slice(0, a.index);
  const last = rest.at(-1);
  if (last && !last.faceUp) rest = [...rest.slice(0, -1), { ...last, faceUp: true }];
  let next = withPile(s, a.from, rest);
  next = withPile(next, a.to, [...getPile(next, a.to), ...src.slice(a.index)]);
  return { ...next, moves: s.moves + 1 };
}

const home = (s: YukonState) => s.foundations.reduce((n, f) => n + f.length, 0);

function rankedMoves(s: YukonState) {
  const out: { from: PileId; index: number; to: PileId; value: number }[] = [];
  s.tableau.forEach((t, i) =>
    t.forEach((c, j) => {
      if (!c.faceUp) return;
      for (const to of TARGETS) {
        if (!canMove(s, `t${i}`, j, to)) continue;
        const below = t[j - 1];
        let value = to[0] === 'f' ? 100 : below && !below.faceUp ? 80 : below ? 20 : 0;
        if (to[0] === 't' && !below && !getPile(s, to).length) value = 0;
        out.push({ from: `t${i}`, index: j, to, value });
      }
    }),
  );
  return out.toSorted((a, b) => b.value - a.value);
}

function hint(s: YukonState): Hint | null {
  const m = rankedMoves(s).find((x) => x.value > 0);
  if (!m) return null;
  const card = getPile(s, m.from)[m.index]!;
  const target = getPile(s, m.to).at(-1);
  return { cards: target ? [card.id, target.id] : [card.id] };
}

/** When nothing is hidden, the rest plays itself home. */
function autoFinish(s: YukonState): YukonAction | null {
  if (s.tableau.some((t) => t.some((c) => !c.faceUp))) return null;
  for (let i = 0; i < 7; i++) {
    const t = s.tableau[i]!;
    for (let f = 0; f < 4 && t.length; f++)
      if (canMove(s, `t${i}`, t.length - 1, `f${f}`)) return { type: 'move', from: `t${i}`, index: t.length - 1, to: `f${f}` };
  }
  return null;
}

export const yukonRules: GameRules<YukonState, YukonAction> = {
  setup,
  reduce,
  hint,
  stuck: (s) => home(s) < 52 && !rankedMoves(s).some((m) => m.value > 0),
  status: (s) => (home(s) === 52 ? 'won' : 'playing'),
  auto: (s) => {
    const action = autoFinish(s);
    return action ? { action, delayMs: 110 } : null;
  },
  score: home,
  summary: (s) => `Solved in ${s.moves} moves`,
};
