import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { fitsFoundation } from '@/core/rules/cards';
import { SUITS, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export interface CastleState {
  /** Rows 0–3 are the left wings, 4–7 the right wings. The last card is the free one. */
  rows: StandardCard[][];
  foundations: StandardCard[][];
  moves: number;
}

export type CastleAction = { type: 'move'; from: number; to: string };

export function setup(rng: Rng): CastleState {
  const deck = createStandardDeck().map((c) => ({ ...c, faceUp: true }));
  const aces = SUITS.map((s) => deck.find((c) => c.suit === s && c.rank === 1)!);
  const rest = shuffle(
    deck.filter((c) => c.rank !== 1),
    rng,
  );
  return { rows: Array.from({ length: 8 }, (_, i) => rest.slice(i * 6, i * 6 + 6)), foundations: aces.map((a) => [a]), moves: 0 };
}

/** Rows build down regardless of suit, one card at a time; an empty row takes any card. */
export function canMove(s: CastleState, from: number, to: string): boolean {
  const card = s.rows[from]?.at(-1);
  if (!card) return false;
  const n = Number(to.slice(1));
  if (to[0] === 'f') return !!s.foundations[n] && fitsFoundation(card, s.foundations[n]);
  if (to[0] !== 'r' || n === from || !s.rows[n]) return false;
  const top = s.rows[n].at(-1);
  return !top || top.rank === card.rank + 1;
}

const TARGETS = ['f0', 'f1', 'f2', 'f3', ...Array.from({ length: 8 }, (_, i) => `r${i}`)];

export function bestTarget(s: CastleState, from: number): string | null {
  const legal = TARGETS.filter((t) => canMove(s, from, t));
  return legal.find((t) => t[0] === 'f') ?? legal.find((t) => s.rows[Number(t.slice(1))]!.length) ?? legal[0] ?? null;
}

function reduce(s: CastleState, a: CastleAction): CastleState {
  if (!canMove(s, a.from, a.to)) return s;
  const card = s.rows[a.from]!.at(-1)!;
  const n = Number(a.to.slice(1));
  const rows = s.rows.map((r, i) => (i === a.from ? r.slice(0, -1) : a.to[0] === 'r' && i === n ? [...r, card] : r));
  const foundations = a.to[0] === 'f' ? s.foundations.map((f, i) => (i === n ? [...f, card] : f)) : s.foundations;
  return { rows, foundations, moves: s.moves + 1 };
}

const home = (s: CastleState) => s.foundations.reduce((n, f) => n + f.length, 0);

function hint(s: CastleState): Hint | null {
  let best: { from: number; to: string; v: number } | null = null;
  s.rows.forEach((r, from) => {
    for (const to of TARGETS) {
      if (!canMove(s, from, to)) continue;
      const toEmpty = to[0] === 'r' && !s.rows[Number(to.slice(1))]!.length;
      const v = to[0] === 'f' ? 100 : toEmpty ? (r.length > 1 ? 10 : 0) : r.length === 1 ? 40 : 30;
      if (v > (best?.v ?? 0)) best = { from, to, v };
    }
  });
  if (!best) return null;
  const { from, to } = best as { from: number; to: string };
  const card = s.rows[from]!.at(-1)!;
  const n = Number(to.slice(1));
  const t = to[0] === 'f' ? s.foundations[n]!.at(-1) : s.rows[n]!.at(-1);
  return { cards: t ? [card.id, t.id] : [card.id] };
}

/** Plays a card home when nothing could still want it: both lower cards of the other colour are home. */
function autoPlay(s: CastleState): CastleAction | null {
  const min = Math.min(...s.foundations.map((f) => f.length));
  for (let from = 0; from < 8; from++) {
    const card = s.rows[from]!.at(-1);
    if (!card || card.rank > min + 1) continue;
    for (let f = 0; f < 4; f++) if (canMove(s, from, `f${f}`)) return { type: 'move', from, to: `f${f}` };
  }
  return null;
}

export const castleRules: GameRules<CastleState, CastleAction> = {
  setup,
  reduce,
  hint,
  stuck: (s) => home(s) < 52 && !hint(s),
  status: (s) => (home(s) === 52 ? 'won' : 'playing'),
  auto: (s) => {
    const action = autoPlay(s);
    return action ? { action, delayMs: 140 } : null;
  },
  score: home,
  summary: (s) => `Castle relieved in ${s.moves} moves.`,
};
