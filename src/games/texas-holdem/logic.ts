import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { HAND_NAME, compareHands, evaluateBestSeven, type RankedHand } from '@/core/rules/pokerHands';
import { aceHigh } from '@/core/rules/trickTaking';
import type { StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const START_STACK = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface Payout {
  seat: number;
  amount: number;
  hand: string | null;
}

export interface HoldemState {
  seats: CpuSeat[];
  players: number;
  stacks: number[];
  hole: StandardCard[][];
  board: StandardCard[];
  deck: StandardCard[];
  phase: Street | 'handOver' | 'matchOver';
  bets: number[];
  committed: number[];
  folded: boolean[];
  acted: boolean[];
  turn: number;
  currentBet: number;
  minRaise: number;
  dealer: number;
  handNo: number;
  payouts: Payout[] | null;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type HoldemAction =
  | { type: 'fold'; by: number }
  | { type: 'check'; by: number }
  | { type: 'call'; by: number }
  | { type: 'raise'; by: number; to: number }
  | { type: 'advance' }
  | { type: 'next' };

const name = (s: HoldemState, p: number) => seatName(s.seats, p);
export const pot = (s: HoldemState) => s.committed.reduce((a, b) => a + b, 0);
const inHand = (s: HoldemState, p: number) => !s.folded[p] && (s.hole[p]?.length ?? 0) > 0;
const canAct = (s: HoldemState, p: number) => inHand(s, p) && s.stacks[p]! > 0;
const live = (s: HoldemState) => Array.from({ length: s.players }, (_, p) => p).filter((p) => inHand(s, p));
export const toCall = (s: HoldemState, p: number) => Math.min(s.stacks[p]!, s.currentBet - s.bets[p]!);

function nextSeat(s: HoldemState, from: number, ok: (p: number) => boolean): number {
  for (let k = 1; k <= s.players; k++) {
    const q = (from + k) % s.players;
    if (ok(q)) return q;
  }
  return from;
}

function post(s: HoldemState, p: number, amount: number): HoldemState {
  const a = Math.min(amount, s.stacks[p]!);
  return {
    ...s,
    stacks: s.stacks.map((x, i) => (i === p ? x - a : x)),
    bets: s.bets.map((x, i) => (i === p ? x + a : x)),
    committed: s.committed.map((x, i) => (i === p ? x + a : x)),
  };
}

function startHand(s: HoldemState, handNo: number): HoldemState {
  const funded = (p: number) => s.stacks[p]! > 0;
  const dealer = nextSeat(s, s.dealer, funded);
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const hole = Array.from({ length: s.players }, (_, p) =>
    funded(p) ? deck.splice(-2).map((c) => ({ ...c, faceUp: p === HUMAN })) : [],
  );
  let next: HoldemState = {
    ...s,
    hole,
    board: [],
    deck,
    phase: 'preflop',
    bets: Array<number>(s.players).fill(0),
    committed: Array<number>(s.players).fill(0),
    folded: Array.from({ length: s.players }, (_, p) => !funded(p)),
    acted: Array<boolean>(s.players).fill(false),
    dealer,
    handNo,
    payouts: null,
    seed: nextSeed(rng),
  };
  const active = Array.from({ length: s.players }, (_, p) => p).filter(funded);
  // Heads-up the dealer posts the small blind and acts first before the flop.
  const sb = active.length === 2 ? dealer : nextSeat(next, dealer, funded);
  const bb = nextSeat(next, sb, funded);
  next = post(post(next, sb, SMALL_BLIND), bb, BIG_BLIND);
  const first = nextSeat(next, bb, (p) => canAct(next, p));
  return {
    ...next,
    currentBet: BIG_BLIND,
    minRaise: BIG_BLIND,
    turn: first,
    log: `Hand ${handNo}. ${name(s, sb)} ${sb === HUMAN ? 'post' : 'posts'} ${SMALL_BLIND}, ${name(s, bb)} ${bb === HUMAN ? 'post' : 'posts'} ${BIG_BLIND}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): HoldemState {
  const players = options.seats === '2' ? 2 : 4;
  const seed = nextSeed(rng);
  const base: HoldemState = {
    seats: drawSeats(rng, players - 1),
    players,
    stacks: Array<number>(players).fill(START_STACK),
    hole: [],
    board: [],
    deck: [],
    phase: 'preflop',
    bets: [],
    committed: [],
    folded: [],
    acted: [],
    turn: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    dealer: players - 1,
    handNo: 1,
    payouts: null,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return startHand(base, 1);
}

/** Is the betting round finished? Everyone who can act has acted and matched the bet. */
function roundDone(s: HoldemState): boolean {
  const actors = live(s).filter((p) => s.stacks[p]! > 0);
  if (live(s).length <= 1) return true;
  if (actors.length === 0) return true;
  if (actors.length === 1 && s.bets[actors[0]!]! >= s.currentBet) return true;
  return actors.every((p) => s.acted[p] && s.bets[p] === s.currentBet);
}

/** Splits the pot into side pots and pays each to the best eligible hand. */
export function showdown(s: HoldemState): Payout[] {
  const contenders = live(s);
  const hands = new Map<number, RankedHand>();
  for (const p of contenders) hands.set(p, evaluateBestSeven([...s.hole[p]!, ...s.board]));
  const levels = [...new Set(s.committed.filter((c) => c > 0))].toSorted((a, b) => a - b);
  const won = new Map<number, number>();
  let prev = 0;
  for (const level of levels) {
    const amount = s.committed.reduce((n, c) => n + Math.max(0, Math.min(c, level) - prev), 0);
    const eligible = contenders.filter((p) => s.committed[p]! >= level);
    prev = level;
    if (!eligible.length || !amount) continue;
    let best: number[] = [];
    for (const p of eligible) {
      if (!best.length) best = [p];
      else {
        const d = compareHands(hands.get(p)!, hands.get(best[0]!)!);
        if (d > 0) best = [p];
        else if (d === 0) best.push(p);
      }
    }
    // Odd chips go to the first winner after the dealer.
    const order = best.toSorted((a, b) => ((a - s.dealer + s.players) % s.players) - ((b - s.dealer + s.players) % s.players));
    const share = Math.floor(amount / best.length);
    order.forEach((p, i) => won.set(p, (won.get(p) ?? 0) + share + (i === 0 ? amount - share * best.length : 0)));
  }
  return [...won].map(([seat, amount]) => ({
    seat,
    amount,
    hand: contenders.length > 1 ? HAND_NAME[hands.get(seat)!.category] : null,
  }));
}

function finishHand(s: HoldemState, payouts: Payout[]): HoldemState {
  const stacks = s.stacks.map((x, p) => x + (payouts.find((w) => w.seat === p)?.amount ?? 0));
  const reveal = live(s).length > 1;
  const hole = s.hole.map((h) => (reveal ? h.map((c) => ({ ...c, faceUp: true })) : h));
  const over = stacks[HUMAN] === 0 || stacks.every((x, p) => p === HUMAN || x === 0);
  const text = payouts
    .map((w) => `${name(s, w.seat)} ${w.seat === HUMAN ? 'win' : 'wins'} ${w.amount}${w.hand ? ` with ${w.hand}` : ''}`)
    .join('; ');
  return { ...s, stacks, hole, payouts, bets: s.bets.map(() => 0), phase: over ? 'matchOver' : 'handOver', log: `${text}.` };
}

/** Moves to the next street (or the showdown) once a betting round is over. */
function advance(s: HoldemState): HoldemState {
  if (live(s).length === 1) {
    const w = live(s)[0]!;
    return finishHand(s, [{ seat: w, amount: pot(s), hand: null }]);
  }
  if (s.phase === 'river' || s.phase === 'handOver' || s.phase === 'matchOver')
    return s.phase === 'river' ? finishHand(s, showdown(s)) : s;
  const n = s.phase === 'preflop' ? 3 : 1;
  const deck = s.deck.slice(0, -1); // burn one
  const cards = deck.slice(-n).map((c) => ({ ...c, faceUp: true }));
  const phase: Street = s.phase === 'preflop' ? 'flop' : s.phase === 'flop' ? 'turn' : 'river';
  const next: HoldemState = {
    ...s,
    deck: deck.slice(0, -n),
    board: [...s.board, ...cards],
    phase,
    bets: s.bets.map(() => 0),
    acted: s.acted.map(() => false),
    currentBet: 0,
    minRaise: BIG_BLIND,
    log: `The ${phase}.`,
  };
  return { ...next, turn: nextSeat(next, next.dealer, (p) => canAct(next, p)) };
}

function act(s: HoldemState, p: number, log: string): HoldemState {
  const next = { ...s, acted: s.acted.map((a, i) => (i === p ? true : a)), log };
  if (roundDone(next)) return { ...next, turn: -1 };
  return { ...next, turn: nextSeat(next, p, (q) => canAct(next, q)) };
}

function reduce(s: HoldemState, a: HoldemAction): HoldemState {
  const betting = s.phase === 'preflop' || s.phase === 'flop' || s.phase === 'turn' || s.phase === 'river';
  if (a.type === 'next') return s.phase === 'handOver' ? startHand(s, s.handNo + 1) : s;
  if (a.type === 'advance') return betting && s.turn === -1 ? advance(s) : s;
  if (!betting || a.by !== s.turn) return s;
  const who = name(s, a.by);
  const owe = toCall(s, a.by);
  switch (a.type) {
    case 'fold':
      return act(
        { ...s, folded: s.folded.map((f, i) => (i === a.by ? true : f)) },
        a.by,
        `${who} ${a.by === HUMAN ? 'fold' : 'folds'}.`,
      );
    case 'check':
      return owe > 0 ? s : act(s, a.by, `${who} ${a.by === HUMAN ? 'check' : 'checks'}.`);
    case 'call':
      return owe <= 0
        ? s
        : act(
            post(s, a.by, owe),
            a.by,
            `${who} ${a.by === HUMAN ? 'call' : 'calls'} ${owe}${owe === s.stacks[a.by] ? ' (all in)' : ''}.`,
          );
    case 'raise': {
      const max = s.bets[a.by]! + s.stacks[a.by]!;
      const to = Math.min(a.to, max);
      const allIn = to === max;
      if (to <= s.currentBet || (to - s.currentBet < s.minRaise && !allIn)) return s;
      const raised = post(s, a.by, to - s.bets[a.by]!);
      const fullRaise = to - s.currentBet >= s.minRaise;
      // A full raise reopens the betting for everyone else.
      const next = {
        ...raised,
        currentBet: to,
        minRaise: fullRaise ? to - s.currentBet : s.minRaise,
        acted: fullRaise ? raised.acted.map(() => false) : raised.acted,
      };
      const verb = s.currentBet === 0 ? 'bet' : 'raise';
      return act(next, a.by, `${who} ${a.by === HUMAN ? verb : `${verb}s`} ${allIn ? `all in (${to})` : `to ${to}`}.`);
    }
  }
}

// ───────────────────────── CPU ─────────────────────────

/** Rough pre-flop strength in [0, 1] (a simplified Chen formula). */
export function preflopStrength(hole: readonly StandardCard[]): number {
  const [a, b] = hole.map(aceHigh).toSorted((x, y) => y - x) as [number, number];
  const base = a === 14 ? 10 : a === 13 ? 8 : a === 12 ? 7 : a === 11 ? 6 : a / 2;
  let score = a === b ? Math.max(5, base * 2) : base;
  if (hole[0]!.suit === hole[1]!.suit) score += 2;
  const gap = a - b - 1;
  if (a !== b) score -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (a !== b && gap <= 1 && a < 12) score += 1;
  return Math.max(0, Math.min(1, score / 20));
}

/** Monte Carlo chance of winning at showdown against `opponents` random hands. */
export function equity(
  hole: readonly StandardCard[],
  board: readonly StandardCard[],
  opponents: number,
  samples: number,
  seed: number,
): number {
  const rng = createRng(seed);
  const known = new Set([...hole, ...board].map((c) => c.id));
  const rest = createStandardDeck().filter((c) => !known.has(c.id));
  let score = 0;
  for (let i = 0; i < samples; i++) {
    const deck = shuffle(rest, rng);
    const full = [...board, ...deck.slice(0, 5 - board.length)];
    let k = 5 - board.length;
    const mine = evaluateBestSeven([...hole, ...full]);
    let best = 1,
      ties = 0;
    for (let o = 0; o < opponents; o++) {
      const theirs = evaluateBestSeven([deck[k]!, deck[k + 1]!, ...full]);
      k += 2;
      const d = compareHands(mine, theirs);
      if (d < 0) {
        best = 0;
        break;
      }
      if (d === 0) ties++;
    }
    score += best ? 1 / (1 + ties) : 0;
  }
  return score / samples;
}

export function cpuDecide(s: HoldemState, p: number, level: CpuLevel = s.cpu): { action: HoldemAction; tense: boolean } {
  const traits = TRAITS[personalityOf(s.seats, p)];
  const opponents = live(s).length - 1;
  const samples = level === 'easy' ? 40 : level === 'normal' ? 120 : 240;
  const key = `${s.seed}${p}${s.phase}${s.currentBet}`;
  let eq =
    s.phase === 'preflop'
      ? preflopStrength(s.hole[p]!) ** (0.6 + opponents * 0.25) * 1.1
      : equity(s.hole[p]!, s.board, opponents, samples, s.seed + p * 7919 + s.board.length);
  if (level === 'easy') eq += (chance(key) - 0.5) * 0.3;
  const owe = toCall(s, p);
  const thePot = pot(s);
  const odds = owe / (thePot + owe || 1);
  const stack = s.stacks[p]!;
  const raiseTo = (frac: number) => s.currentBet + Math.max(s.minRaise, Math.round((thePot * frac) / 10) * 10);
  const heavy = owe > thePot * 0.5;
  const strongLine = 0.72 - traits.risk * 0.15;
  // Slow-play: a tricky player sometimes just calls with a monster.
  if (eq > 0.82 && traits.bluff > 0.6 && s.phase !== 'river' && chance(`${key}slow`) < 0.4)
    return { action: owe > 0 ? { type: 'call', by: p } : { type: 'check', by: p }, tense: false };
  if (eq > strongLine && stack > owe) return { action: { type: 'raise', by: p, to: raiseTo(eq > 0.85 ? 1 : 0.6) }, tense: false };
  if (owe === 0) {
    // Bluff a bet now and then.
    if (chance(`${key}bluff`) < traits.bluff * 0.25 && s.phase !== 'preflop')
      return { action: { type: 'raise', by: p, to: raiseTo(0.5) }, tense: true };
    return { action: { type: 'check', by: p }, tense: false };
  }
  const margin = level === 'hard' ? 0.02 : 0.06;
  // Skeptical players make hero calls against big bets.
  const hero = heavy ? traits.suspicion * 0.08 : 0;
  if (eq + hero >= odds + margin) return { action: { type: 'call', by: p }, tense: heavy };
  return { action: { type: 'fold', by: p }, tense: heavy };
}

export const holdemRules: GameRules<HoldemState, HoldemAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.turn !== HUMAN) return null;
    const opponents = live(s).length - 1;
    const eq = s.phase === 'preflop' ? preflopStrength(s.hole[HUMAN]!) : equity(s.hole[HUMAN]!, s.board, opponents, 300, s.seed);
    const owe = toCall(s, HUMAN);
    const odds = owe / (pot(s) + owe || 1);
    return {
      message: `Your chance to win is about ${Math.round(eq * 100)}%${owe ? `; calling needs ${Math.round(odds * 100)}%` : ''}.`,
    };
  },
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.stacks[HUMAN]! > 0 ? 'won' : 'lost'),
  auto: (s) => {
    const betting = s.phase === 'preflop' || s.phase === 'flop' || s.phase === 'turn' || s.phase === 'river';
    if (!betting) return null;
    if (s.turn === -1)
      return { action: { type: 'advance' }, delayMs: live(s).filter((p) => s.stacks[p]! > 0).length <= 1 ? 1100 : 700 };
    if (s.turn === HUMAN) return null;
    const { action, tense } = cpuDecide(s, s.turn);
    return { action, delayMs: 380 + tempo(personalityOf(s.seats, s.turn), s.cpu, tense, key(s)) };
  },
  score: (s) => s.stacks[HUMAN]!,
  summary: (s) =>
    s.stacks[HUMAN]! > 0 ? `You took every chip at the table: ${s.stacks[HUMAN]}.` : `You were knocked out in hand ${s.handNo}.`,
};

const key = (s: HoldemState) => `${s.handNo}${s.phase}${s.turn}`;
