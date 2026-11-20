import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, cardLabel, type CardId, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, readLevel, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
export const HAND_LIMIT = 8;
/** Points needed with 0, 1, 2, 3 or 4 Kings in play. */
export const GOALS = [21, 14, 10, 7, 5] as const;

/** A point card and any Jacks stacked on it; the top Jack's player controls it. */
export interface PointCard {
  card: StandardCard;
  owner: number;
  jacks: { card: StandardCard; by: number }[];
}

export interface Pending {
  card: StandardCard;
  by: number;
  target: CardId | null;
  /** 2s played to counter (and counter-counter) it. */
  chain: StandardCard[];
}

export interface CuttleState {
  seat: CpuSeat;
  hands: [StandardCard[], StandardCard[]];
  deck: StandardCard[];
  scrap: StandardCard[];
  points: PointCard[];
  /** Kings, Queens and Glasses (8s) in front of each player. */
  perms: [StandardCard[], StandardCard[]];
  turn: number;
  phase: 'main' | 'counter' | 'discard' | 'rummage' | 'seven';
  pending: Pending | null;
  /** Who must answer: the counter decision, the 4's discards, the 3's pick or the 7's play. */
  actor: number;
  /** Card revealed by a 7, to be played at once. */
  revealed: StandardCard | null;
  passes: number;
  winner: number | 'draw' | null;
  cpu: CpuLevel;
  log: string;
}

/** Where a played card comes from: the hand, or the card a 7 just revealed. */
export type CuttleAction =
  | { type: 'draw'; by: number }
  | { type: 'points'; by: number; id: CardId }
  | { type: 'scuttle'; by: number; id: CardId; target: CardId }
  | { type: 'royal'; by: number; id: CardId; target?: CardId }
  | { type: 'oneoff'; by: number; id: CardId; target?: CardId }
  | { type: 'counter'; by: number; id: CardId }
  | { type: 'resolve'; by: number }
  | { type: 'discard'; by: number; ids: CardId[] }
  | { type: 'rummage'; by: number; id: CardId }
  | { type: 'pass'; by: number };

export const ABILITY: Record<number, string> = {
  1: 'One-off: scrap every point card',
  2: 'One-off: scrap a King, Queen, Jack or Glasses — or counter a one-off',
  3: 'One-off: take any card from the scrap pile',
  4: 'One-off: opponent discards two cards',
  5: 'One-off: draw two cards',
  6: 'One-off: scrap every King, Queen, Jack and Glasses',
  7: 'One-off: reveal the top card and play it at once',
  8: 'Points, or Glasses: your opponent plays with their hand revealed',
  9: 'One-off: return a King, Queen, Jack or Glasses to its owner’s hand',
  10: 'Points only (or scuttle)',
  11: 'Jack: steal one of your opponent’s point cards',
  12: 'Queen: protects your other cards from 2s, 9s and Jacks',
  13: 'King: lowers the points you need (21 → 14 → 10 → 7 → 5)',
};

const up = (c: StandardCard) => ({ ...c, faceUp: true });
const name = (s: CuttleState, p: number) => (p === HUMAN ? 'You' : s.seat.name);
const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit));

export function setup(rng: Rng, options: RuleOptions = {}): CuttleState {
  const deck = shuffle(createStandardDeck(), rng);
  const [seat] = drawSeats(rng, 1);
  return {
    seat: seat!,
    hands: [sortHand(deck.splice(-6).map(up)), deck.splice(-5)],
    deck,
    scrap: [],
    points: [],
    perms: [[], []],
    turn: HUMAN,
    phase: 'main',
    pending: null,
    actor: HUMAN,
    revealed: null,
    passes: 0,
    winner: null,
    cpu: readLevel(options),
    log: `First to 21 points wins. You go first against ${seat!.name}.`,
  };
}

export const controller = (pc: PointCard) => pc.jacks.at(-1)?.by ?? pc.owner;
export const kings = (s: CuttleState, p: number) => s.perms[p]!.filter((c) => c.rank === 13).length;
export const goalOf = (s: CuttleState, p: number) => GOALS[Math.min(4, kings(s, p))]!;
export const pointsOf = (s: CuttleState, p: number) =>
  s.points.filter((pc) => controller(pc) === p).reduce((n, pc) => n + pc.card.rank, 0);
const queens = (s: CuttleState, p: number) => s.perms[p]!.filter((c) => c.rank === 12);
export const hasGlasses = (s: CuttleState, p: number) => s.perms[p]!.some((c) => c.rank === 8);

/** Card being played: from the hand, or the one a 7 revealed. */
function source(s: CuttleState, p: number, id: CardId): StandardCard | null {
  if (s.phase === 'seven') return s.actor === p && s.revealed?.id === id ? s.revealed : null;
  if (s.phase !== 'main' || s.turn !== p) return null;
  return s.hands[p]!.find((c) => c.id === id) ?? null;
}

function remove(s: CuttleState, p: number, id: CardId): CuttleState {
  if (s.revealed?.id === id) return { ...s, revealed: null };
  const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
  hands[p] = hands[p]!.filter((c) => c.id !== id);
  return { ...s, hands };
}

/**
 * Cards a targeted effect (2, 9 or Jack) may hit on `owner`'s side. A Queen protects everything
 * else: with one in play only Queens can be targeted.
 */
export function targetsOf(s: CuttleState, kind: 'perm' | 'point', owner: number): CardId[] {
  const qs = queens(s, owner);
  if (kind === 'point') return qs.length ? [] : s.points.filter((pc) => controller(pc) === owner).map((pc) => pc.card.id);
  if (qs.length) return qs.map((q) => q.id);
  const jacks = s.points.flatMap((pc) => (pc.jacks.length && pc.jacks.at(-1)!.by === owner ? [pc.jacks.at(-1)!.card.id] : []));
  return [...s.perms[owner]!.map((c) => c.id), ...jacks];
}

const finishTurn = (s: CuttleState, p: number, log: string): CuttleState =>
  checkWin({ ...s, phase: 'main', pending: null, revealed: null, turn: 1 - p, actor: 1 - p, passes: 0, log });

function checkWin(s: CuttleState): CuttleState {
  for (const p of [s.turn === HUMAN ? CPU : HUMAN, s.turn])
    if (pointsOf(s, p) >= goalOf(s, p))
      return { ...s, winner: p, log: `${s.log} ${name(s, p)} ${p === HUMAN ? 'reach' : 'reaches'} ${pointsOf(s, p)} points!` };
  return s;
}

/** Scraps or returns a permanent (or a Jack, which hands its point card back). */
function takePermanent(s: CuttleState, id: CardId, to: 'scrap' | 'hand'): CuttleState {
  for (const p of [0, 1]) {
    const card = s.perms[p]!.find((c) => c.id === id);
    if (card) {
      const perms: [StandardCard[], StandardCard[]] = [s.perms[0], s.perms[1]];
      perms[p] = perms[p]!.filter((c) => c.id !== id);
      const next = { ...s, perms };
      if (to === 'scrap') return { ...next, scrap: [...next.scrap, card] };
      const hands: [StandardCard[], StandardCard[]] = [next.hands[0], next.hands[1]];
      hands[p] = [...hands[p]!, { ...card, faceUp: p === HUMAN }];
      return { ...next, hands };
    }
  }
  const pc = s.points.find((x) => x.jacks.some((j) => j.card.id === id));
  if (!pc) return s;
  const jack = pc.jacks.find((j) => j.card.id === id)!;
  const points = s.points.map((x) => (x === pc ? { ...x, jacks: x.jacks.filter((j) => j.card.id !== id) } : x));
  if (to === 'scrap') return { ...s, points, scrap: [...s.scrap, jack.card] };
  const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
  hands[jack.by] = [...hands[jack.by]!, { ...jack.card, faceUp: jack.by === HUMAN }];
  return { ...s, points, hands };
}

function drawUpTo(s: CuttleState, p: number, n: number): CuttleState {
  const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
  const deck = s.deck.slice();
  for (let i = 0; i < n && deck.length && hands[p]!.length < HAND_LIMIT; i++)
    hands[p] = [...hands[p]!, { ...deck.pop()!, faceUp: p === HUMAN }];
  if (p === HUMAN) hands[0] = sortHand(hands[0]);
  return { ...s, hands, deck };
}

/** Carries out a one-off that survived the counter chain. */
function resolveOneOff(s: CuttleState, pend: Pending): CuttleState {
  const p = pend.by,
    o = 1 - p;
  const scrapped = { ...s, scrap: [...s.scrap, pend.card, ...pend.chain], pending: null };
  const who = name(s, p);
  switch (pend.card.rank) {
    case 1: {
      const gone = scrapped.points.flatMap((pc) => [pc.card, ...pc.jacks.map((j) => j.card)]);
      return finishTurn(
        { ...scrapped, points: [], scrap: [...scrapped.scrap, ...gone] },
        p,
        `${who}: every point card is scrapped!`,
      );
    }
    case 2:
      return finishTurn(
        takePermanent(scrapped, pend.target!, 'scrap'),
        p,
        `${who} ${p === HUMAN ? 'scrap' : 'scraps'} a permanent.`,
      );
    case 9:
      return finishTurn(
        takePermanent(scrapped, pend.target!, 'hand'),
        p,
        `${who} ${p === HUMAN ? 'send' : 'sends'} a card back to its owner’s hand.`,
      );
    case 3:
      // The 3 (and any 2s) only join the scrap after the pick, so they can't be taken back.
      return s.scrap.length
        ? {
            ...s,
            pending: pend,
            phase: 'rummage',
            actor: p,
            log: `${who} ${p === HUMAN ? 'rummage' : 'rummages'} through the scrap pile.`,
          }
        : finishTurn(scrapped, p, 'The scrap pile has nothing to take.');
    case 4: {
      if (!s.hands[o]!.length)
        return finishTurn(scrapped, p, `${name(s, o)} ${o === HUMAN ? 'have' : 'has'} nothing to discard.`);
      return { ...scrapped, phase: 'discard', actor: o, log: `${name(s, o)} must discard two cards.` };
    }
    case 5:
      return finishTurn(drawUpTo(scrapped, p, 2), p, `${who} ${p === HUMAN ? 'draw' : 'draws'} two cards.`);
    case 6: {
      const jacks = scrapped.points.flatMap((pc) => pc.jacks.map((j) => j.card));
      return finishTurn(
        {
          ...scrapped,
          perms: [[], []],
          points: scrapped.points.map((pc) => ({ ...pc, jacks: [] })),
          scrap: [...scrapped.scrap, ...scrapped.perms[0], ...scrapped.perms[1], ...jacks],
        },
        p,
        `${who}: every permanent is scrapped!`,
      );
    }
    case 7: {
      const top = scrapped.deck.at(-1);
      if (!top) return finishTurn(scrapped, p, 'The deck is empty.');
      const next = { ...scrapped, deck: scrapped.deck.slice(0, -1), revealed: up(top), phase: 'seven' as const, actor: p };
      if (!anyUse(next, p, next.revealed))
        return finishTurn(
          { ...next, scrap: [...next.scrap, next.revealed!], revealed: null },
          p,
          `${cardLabel(top)} is revealed but cannot be played — scrapped.`,
        );
      return { ...next, log: `${who} ${p === HUMAN ? 'reveal' : 'reveals'} ${cardLabel(top)} and must play it.` };
    }
  }
  return finishTurn(scrapped, p, '');
}

/** Can this card be played in some way right now? */
function anyUse(s: CuttleState, p: number, card: StandardCard): boolean {
  if (card.rank <= 10) return true;
  if (card.rank === 11) return targetsOf(s, 'point', 1 - p).length > 0;
  return true;
}

export function canScuttle(card: StandardCard, target: PointCard): boolean {
  return (
    card.rank <= 10 &&
    (card.rank > target.card.rank ||
      (card.rank === target.card.rank && SUITS.indexOf(card.suit) < SUITS.indexOf(target.card.suit)))
  );
}

/** One-offs that need a target, and whether one exists. */
export function oneOffTargets(s: CuttleState, p: number, card: StandardCard): CardId[] | null {
  if (card.rank === 2 || card.rank === 9)
    return [...targetsOf(s, 'perm', 1 - p), ...(card.rank === 9 ? targetsOf(s, 'perm', p) : [])];
  return null;
}

export const isOneOff = (c: StandardCard) => [1, 2, 3, 4, 5, 6, 7, 9].includes(c.rank);

function reduce(s: CuttleState, a: CuttleAction): CuttleState {
  if (s.winner !== null) return s;
  const who = name(s, a.by);
  switch (a.type) {
    case 'draw': {
      if (s.phase !== 'main' || s.turn !== a.by || !s.deck.length || s.hands[a.by]!.length >= HAND_LIMIT) return s;
      return finishTurn(drawUpTo(s, a.by, 1), a.by, `${who} ${a.by === HUMAN ? 'draw' : 'draws'} a card.`);
    }
    case 'pass': {
      if (s.phase !== 'main' || s.turn !== a.by || s.deck.length) return s;
      const passes = s.passes + 1;
      if (passes >= 3) return { ...s, winner: 'draw', log: 'Three passes in a row — the game is a draw.' };
      return { ...finishTurn(s, a.by, `${who} ${a.by === HUMAN ? 'pass' : 'passes'}.`), passes };
    }
    case 'points': {
      const card = source(s, a.by, a.id);
      if (!card || card.rank > 10) return s;
      const next = remove(s, a.by, a.id);
      return finishTurn(
        { ...next, points: [...next.points, { card: up(card), owner: a.by, jacks: [] }] },
        a.by,
        `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)} for ${card.rank} points.`,
      );
    }
    case 'scuttle': {
      const card = source(s, a.by, a.id);
      const target = s.points.find((pc) => pc.card.id === a.target);
      if (!card || !target || controller(target) === a.by || !canScuttle(card, target)) return s;
      const next = remove(s, a.by, a.id);
      return finishTurn(
        {
          ...next,
          points: next.points.filter((pc) => pc !== target),
          scrap: [...next.scrap, card, target.card, ...target.jacks.map((j) => j.card)],
        },
        a.by,
        `${who} ${a.by === HUMAN ? 'scuttle' : 'scuttles'} ${cardLabel(target.card)} with ${cardLabel(card)}.`,
      );
    }
    case 'royal': {
      const card = source(s, a.by, a.id);
      if (!card || ![8, 11, 12, 13].includes(card.rank)) return s;
      const next = remove(s, a.by, a.id);
      if (card.rank === 11) {
        if (!a.target || !targetsOf(s, 'point', 1 - a.by).includes(a.target)) return s;
        const points = next.points.map((pc) =>
          pc.card.id === a.target ? { ...pc, jacks: [...pc.jacks, { card: up(card), by: a.by }] } : pc,
        );
        return finishTurn(
          { ...next, points },
          a.by,
          `${who} ${a.by === HUMAN ? 'steal' : 'steals'} a point card with ${cardLabel(card)}.`,
        );
      }
      const perms: [StandardCard[], StandardCard[]] = [next.perms[0], next.perms[1]];
      perms[a.by] = [...perms[a.by]!, up(card)];
      const what = card.rank === 13 ? 'King' : card.rank === 12 ? 'Queen' : 'Glasses';
      return finishTurn({ ...next, perms }, a.by, `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)} as a ${what}.`);
    }
    case 'oneoff': {
      const card = source(s, a.by, a.id);
      if (!card || !isOneOff(card)) return s;
      const targets = oneOffTargets(s, a.by, card);
      if (targets && (!a.target || !targets.includes(a.target))) return s;
      if (card.rank === 3 && !s.scrap.length) return s;
      const next = remove(s, a.by, a.id);
      return {
        ...next,
        phase: 'counter',
        pending: { card: up(card), by: a.by, target: a.target ?? null, chain: [] },
        actor: 1 - a.by,
        log: `${who} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)} as a one-off. ${name(s, 1 - a.by)} may counter with a 2.`,
      };
    }
    case 'counter': {
      if (s.phase !== 'counter' || s.actor !== a.by) return s;
      const two = s.hands[a.by]!.find((c) => c.id === a.id && c.rank === 2);
      if (!two) return s;
      const next = remove(s, a.by, a.id);
      return {
        ...next,
        pending: { ...s.pending!, chain: [...s.pending!.chain, up(two)] },
        actor: 1 - a.by,
        log: `${who} ${a.by === HUMAN ? 'counter' : 'counters'} with ${cardLabel(two)}!`,
      };
    }
    case 'resolve': {
      if (s.phase !== 'counter' || s.actor !== a.by) return s;
      const pend = s.pending!;
      if (pend.chain.length % 2 === 1)
        return finishTurn(
          { ...s, scrap: [...s.scrap, pend.card, ...pend.chain] },
          pend.by,
          `The ${cardLabel(pend.card)} is countered.`,
        );
      return resolveOneOff(s, pend);
    }
    case 'discard': {
      if (s.phase !== 'discard' || s.actor !== a.by) return s;
      const need = Math.min(2, s.hands[a.by]!.length);
      const cards = s.hands[a.by]!.filter((c) => a.ids.includes(c.id));
      if (cards.length !== need || a.ids.length !== need) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = hands[a.by]!.filter((c) => !a.ids.includes(c.id));
      return finishTurn(
        { ...s, hands, scrap: [...s.scrap, ...cards.map(up)] },
        1 - a.by,
        `${who} ${a.by === HUMAN ? 'discard' : 'discards'} ${cards.map(cardLabel).join(' and ')}.`,
      );
    }
    case 'rummage': {
      if (s.phase !== 'rummage' || s.actor !== a.by) return s;
      const card = s.scrap.find((c) => c.id === a.id);
      if (!card) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = [...hands[a.by]!, { ...card, faceUp: a.by === HUMAN }];
      if (a.by === HUMAN) hands[0] = sortHand(hands[0]);
      const spent = s.pending ? [s.pending.card, ...s.pending.chain] : [];
      return finishTurn(
        { ...s, hands, scrap: [...s.scrap.filter((c) => c.id !== a.id), ...spent] },
        a.by,
        `${who} ${a.by === HUMAN ? 'take' : 'takes'} ${cardLabel(card)} from the scrap.`,
      );
    }
  }
}

// ───────────────────────── CPU ─────────────────────────

/** Every legal main-phase action for `p` (playing from the hand, or the revealed card on a 7). */
export function legalActions(s: CuttleState, p: number): CuttleAction[] {
  const cards = s.phase === 'seven' ? (s.revealed ? [s.revealed] : []) : s.hands[p]!;
  const out: CuttleAction[] = [];
  for (const c of cards) {
    if (c.rank <= 10) {
      out.push({ type: 'points', by: p, id: c.id });
      for (const pc of s.points)
        if (controller(pc) !== p && canScuttle(c, pc)) out.push({ type: 'scuttle', by: p, id: c.id, target: pc.card.id });
    }
    if (c.rank === 8 || c.rank === 12 || c.rank === 13) out.push({ type: 'royal', by: p, id: c.id });
    if (c.rank === 11) for (const t of targetsOf(s, 'point', 1 - p)) out.push({ type: 'royal', by: p, id: c.id, target: t });
    if (isOneOff(c)) {
      const targets = oneOffTargets(s, p, c);
      if (targets) for (const t of targets) out.push({ type: 'oneoff', by: p, id: c.id, target: t });
      else if (c.rank !== 3 || s.scrap.length) out.push({ type: 'oneoff', by: p, id: c.id });
    }
  }
  if (s.phase === 'main') {
    if (s.deck.length && s.hands[p]!.length < HAND_LIMIT) out.push({ type: 'draw', by: p });
    if (!s.deck.length) out.push({ type: 'pass', by: p });
  }
  return out;
}

/** Scores an action by simulating it (one-offs assumed to resolve uncountered). */
function evaluate(s: CuttleState, p: number, a: CuttleAction): number {
  let next = reduce(s, a);
  if (next === s) return -Infinity;
  if (next.phase === 'counter') next = reduce(next, { type: 'resolve', by: next.actor });
  if (next.phase === 'discard') next = reduce(next, { type: 'discard', by: next.actor, ids: cpuDiscard(next, next.actor) });
  const o = 1 - p;
  if (next.winner === p) return 10000;
  const mine = pointsOf(next, p) / goalOf(next, p);
  const theirs = pointsOf(next, o) / goalOf(next, o);
  let v = (mine - theirs) * 100 + (next.hands[p]!.length - next.hands[o]!.length) * 3;
  if (theirs >= 0.75) v -= 40 * theirs;
  if (a.type === 'draw') v += 2;
  // Keep a 2 to counter with when it would be the last one.
  if (
    'id' in a &&
    s.hands[p]!.find((c) => c.id === a.id)?.rank === 2 &&
    a.type !== 'oneoff' &&
    s.hands[p]!.filter((c) => c.rank === 2).length === 1
  )
    v -= 6;
  return v;
}

export function cpuDiscard(s: CuttleState, p: number): CardId[] {
  return s.hands[p]!.toSorted((a, b) => a.rank - b.rank)
    .slice(0, Math.min(2, s.hands[p]!.length))
    .map((c) => c.id);
}

export function cpuAct(s: CuttleState, level: CpuLevel = s.cpu, p = CPU): CuttleAction {
  if (s.phase === 'discard') return { type: 'discard', by: p, ids: cpuDiscard(s, p) };
  if (s.phase === 'rummage') {
    return { type: 'rummage', by: p, id: s.scrap.reduce((a, b) => (b.rank > a.rank && b.rank <= 10 ? b : a)).id };
  }
  if (s.phase === 'counter') {
    const two = s.hands[p]!.find((c) => c.rank === 2);
    const pend = s.pending!;
    // Counter a harmful one-off from the opponent; let a counter of our own stand.
    const harmful =
      pend.by !== p &&
      (pend.card.rank === 1
        ? pointsOf(s, p) > pointsOf(s, 1 - p)
        : [2, 4, 6, 9].includes(pend.card.rank) || pend.card.rank === 7);
    const theirCounter = pend.chain.length % 2 === 1 ? pend.by === p : pend.by !== p;
    const want = two && (pend.chain.length ? theirCounter : harmful);
    if (want && (level !== 'easy' || chance(`${s.deck.length}${p}`) < 0.5)) return { type: 'counter', by: p, id: two.id };
    return { type: 'resolve', by: p };
  }
  const actions = legalActions(s, p);
  if (!actions.length) return { type: 'pass', by: p };
  if (level === 'easy' && chance(`${s.deck.length}${s.scrap.length}${p}`) < 0.35)
    return actions[Math.floor(chance(`${s.deck.length}e`) * actions.length)]!;
  const risk = TRAITS[s.seat.personality].risk;
  return actions.reduce((a, b) =>
    evaluate(s, p, b) + (b.type === 'points' ? risk * 2 : 0) > evaluate(s, p, a) + (a.type === 'points' ? risk * 2 : 0) ? b : a,
  );
}

export const cuttleRules: GameRules<CuttleState, CuttleAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.winner !== null) return null;
    const mine = (s.phase === 'main' && s.turn === HUMAN) || (s.phase !== 'main' && s.actor === HUMAN);
    if (!mine) return null;
    const a = cpuAct(s, 'hard', HUMAN);
    const labels: Record<string, string> = {
      draw: 'Draw a card.',
      points: 'Play it for points.',
      scuttle: 'Scuttle their point card.',
      royal: 'Play it as a permanent.',
      oneoff: 'Use it as a one-off.',
      counter: 'Counter with your 2!',
      resolve: 'Let it resolve.',
      discard: 'Discard these.',
      rummage: 'Take this card.',
      pass: 'Pass.',
    };
    const cards = 'id' in a ? [a.id] : a.type === 'discard' ? a.ids : [];
    return { cards, message: labels[a.type]! };
  },
  status: (s) => (s.winner === null ? 'playing' : s.winner === HUMAN ? 'won' : 'lost'),
  auto: (s) => {
    if (s.winner !== null) return null;
    const p = s.phase === 'main' ? s.turn : s.actor;
    if (p === HUMAN) return null;
    const action = cpuAct(s);
    return { action, delayMs: 420 + tempo(s.seat.personality, s.cpu, action.type === 'counter') };
  },
  score: (s) => pointsOf(s, HUMAN),
  summary: (s) =>
    s.winner === 'draw'
      ? 'A draw: nobody could finish.'
      : `You ${pointsOf(s, HUMAN)}/${goalOf(s, HUMAN)} – ${pointsOf(s, CPU)}/${goalOf(s, CPU)} ${s.seat.name}`,
};
