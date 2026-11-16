import { createDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, rankLabel, type Card, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import { isOn, type GameRules, type RuleOptions } from '@/core/types/game';
import { pick, readLevel, type CpuLevel } from '../cpuLevel';
import { S_EIGHT, S_JACK, S_THREE, S_TWO, includesStrength, shapesOf, strengthOf, type Shape } from './plays';

export const PLAYERS = 4;
export const HUMAN = 0;
export const TITLES = ['Daifugo', 'Fugo', 'Hinmin', 'Daihinmin'] as const;
/** Match points per finishing place. */
export const POINTS = [3, 2, 1, 0] as const;

export interface DaifugoRules {
  rounds: number;
  jokers: number;
  stairs: boolean;
  eightCut: boolean;
  revolution: boolean;
  stairRevolution: boolean;
  jBack: boolean;
  lock: boolean;
  spade3: boolean;
  forbiddenFinish: boolean;
  miyakoOchi: boolean;
  exchange: boolean;
  cpu: CpuLevel;
}

export function readRules(o: RuleOptions = {}): DaifugoRules {
  const on = (id: string, def: boolean) => (o[id] === undefined ? def : isOn(o, id));
  return {
    rounds: Number(o.rounds ?? '5') || 5,
    jokers: Math.min(2, Math.max(0, Number(o.jokers ?? '1'))),
    stairs: on('stairs', true),
    eightCut: on('eightCut', true),
    revolution: on('revolution', true),
    stairRevolution: on('stairRevolution', false),
    jBack: on('jBack', true),
    lock: on('lock', true),
    spade3: on('spade3', true),
    forbiddenFinish: on('forbiddenFinish', true),
    miyakoOchi: on('miyakoOchi', true),
    exchange: on('exchange', true),
    cpu: readLevel(o),
  };
}

export interface Play extends Shape {
  cards: Card[];
  by: number;
}

export interface Give {
  from: number;
  to: number;
  count: number;
}

export interface DaifugoState {
  rules: DaifugoRules;
  round: number;
  phase: 'exchange' | 'play' | 'roundOver' | 'matchOver';
  hands: Card[][];
  table: Play | null;
  cleared: Card[];
  turn: number;
  passed: boolean[];
  revolution: boolean;
  jBack: boolean;
  /** Suits every play must follow while the trick is locked. */
  lock: Suit[] | null;
  /** Normal finishers, best first. */
  finished: number[];
  /** Players knocked to the bottom (forbidden finish, miyako-ochi), in order of falling. */
  fallen: number[];
  /** Places from the previous round (index = player), used for exchange and miyako-ochi. */
  lastPlaces: number[] | null;
  /** Places this round once it ends. */
  places: number[] | null;
  points: number[];
  /** A card exchange the human still has to choose. */
  pendingGive: Give | null;
  log: string;
  seed: number;
}

export type DaifugoAction =
  | { type: 'play'; by: number; ids: CardId[] }
  | { type: 'pass'; by: number }
  | { type: 'give'; by: number; ids: CardId[] }
  | { type: 'nextRound' };

const name = (p: number) => (p === HUMAN ? 'You' : `CPU ${p}`);
const verb = (p: number, you: string, they: string) => (p === HUMAN ? you : they);

/** Strength order is reversed by a revolution, and temporarily flipped again by J-back. */
export const reversed = (s: DaifugoState) => s.revolution !== s.jBack;

const handOrder = (c: Card) => (c.kind === 'joker' ? 100 : strengthOf(c) * 4 + SUITS.indexOf(c.suit));

export function sortHand(h: readonly Card[]): Card[] {
  return h.toSorted((a, b) => handOrder(a) - handOrder(b));
}

const isOut = (s: DaifugoState, p: number) => s.finished.includes(p) || s.fallen.includes(p);
const activePlayers = (s: DaifugoState) => s.hands.map((_, p) => p).filter((p) => !isOut(s, p));

function nextActive(s: DaifugoState, from: number, skipPassed: boolean): number {
  for (let k = 1; k <= PLAYERS; k++) {
    const q = (from + k) % PLAYERS;
    if (!isOut(s, q) && !(skipPassed && s.passed[q])) return q;
  }
  return from;
}

// ───────────────────────── legality ─────────────────────────

const isSpade3 = (cards: readonly Card[]) =>
  cards.length === 1 && cards[0]!.kind === 'standard' && cards[0]!.suit === 'spades' && cards[0]!.rank === 3;

/** Do the play's suits fit the lock (Jokers stand in for any locked suit)? */
function fitsLock(lock: Suit[], shape: Shape): boolean {
  if (shape.kind === 'stairs') return shape.suits[0] === lock[0];
  const remaining = lock.slice();
  for (const suit of shape.suits) {
    const i = remaining.indexOf(suit);
    if (i < 0) return false;
    remaining.splice(i, 1);
  }
  return true;
}

/** The shape this set would be played as, or null if it can't be played now. */
export function legalShape(s: DaifugoState, cards: readonly Card[]): Shape | null {
  const rev = reversed(s);
  const shapes = shapesOf(cards, s.rules.stairs, !rev);
  const t = s.table;
  for (const shape of shapes) {
    if (!t) return shape;
    if (shape.kind !== t.kind || shape.count !== t.count) continue;
    if (s.lock && !fitsLock(s.lock, shape)) continue;
    // Spade 3 is the only answer to a lone Joker.
    if (t.jokersOnly && t.count === 1) {
      if (s.rules.spade3 && isSpade3(cards)) return shape;
      continue;
    }
    if (shape.jokersOnly) return shape;
    if (t.jokersOnly) continue;
    if (rev ? shape.low < t.low : shape.low > t.low) return shape;
  }
  return null;
}

/** Cards you may not finish on: Joker, 8 (with 8-cut), 2 (3 in a revolution), or the Spade-3 counter. */
function isForbiddenFinish(s: DaifugoState, cards: readonly Card[], shape: Shape, counter: boolean): boolean {
  if (!s.rules.forbiddenFinish) return false;
  if (shape.jokers > 0 || counter) return true;
  const top = s.revolution ? S_THREE : S_TWO;
  return cards.some((c) => c.kind === 'standard' && (strengthOf(c) === top || (s.rules.eightCut && strengthOf(c) === S_EIGHT)));
}

// ───────────────────────── round flow ─────────────────────────

function clearTrick(s: DaifugoState, leader: number, why: string): DaifugoState {
  const lead = isOut(s, leader) ? nextActive(s, leader, false) : leader;
  return {
    ...s,
    table: null,
    cleared: [...s.cleared, ...(s.table?.cards ?? [])],
    passed: s.passed.map(() => false),
    jBack: false,
    lock: null,
    turn: lead,
    log: `${s.log} ${why} ${name(lead)} ${verb(lead, 'lead', 'leads')}.`.trim(),
  };
}

function placesOf(s: DaifugoState): number[] {
  const places = Array<number>(PLAYERS).fill(-1);
  s.finished.forEach((p, i) => (places[p] = i));
  s.fallen.forEach((p, i) => (places[p] = PLAYERS - 1 - i));
  const left = activePlayers(s);
  if (left.length === 1) places[left[0]!] = s.finished.length;
  return places;
}

function endRoundIfDone(s: DaifugoState): DaifugoState {
  if (activePlayers(s).length > 1) return s;
  const places = placesOf(s);
  const points = s.points.map((pts, p) => pts + POINTS[places[p]!]!);
  const last = s.round >= s.rules.rounds;
  return {
    ...s,
    phase: last ? 'matchOver' : 'roundOver',
    places,
    points,
    table: null,
    log: `${s.log} Round ${s.round} over.`,
  };
}

/** Knocks the previous Daifugo to the bottom when someone else finishes first. */
function applyMiyakoOchi(s: DaifugoState, finisher: number): DaifugoState {
  if (!s.rules.miyakoOchi || !s.lastPlaces || s.finished.length !== 1) return s;
  const prev = s.lastPlaces.indexOf(0);
  if (prev === finisher || prev < 0 || isOut(s, prev)) return s;
  const hands = s.hands.map((h, p) => (p === prev ? [] : h));
  return {
    ...s,
    hands,
    cleared: [...s.cleared, ...s.hands[prev]!],
    fallen: [...s.fallen, prev],
    log: `${s.log} Miyako-ochi! ${name(prev)} ${verb(prev, 'fall', 'falls')} to Daihinmin.`,
  };
}

function deal(rules: DaifugoRules, seed: number, round: number, lastPlaces: number[] | null, points: number[]): DaifugoState {
  const rng = createRng(seed);
  const deck = shuffle(createDeck({ jokers: rules.jokers }), rng);
  const hands: Card[][] = Array.from({ length: PLAYERS }, () => []);
  deck.forEach((c, i) => hands[i % PLAYERS]!.push(c));
  let s: DaifugoState = {
    rules,
    round,
    phase: 'play',
    hands: hands.map((h, p) => sortHand(h).map((c) => ({ ...c, faceUp: p === HUMAN }))),
    table: null,
    cleared: [],
    turn: 0,
    passed: [false, false, false, false],
    revolution: false,
    jBack: false,
    lock: null,
    finished: [],
    fallen: [],
    lastPlaces,
    places: null,
    points,
    pendingGive: null,
    log: '',
    seed: nextSeed(rng),
  };
  if (!lastPlaces) {
    const first = s.hands.findIndex((h) => h.some((c) => c.kind === 'standard' && c.suit === 'diamonds' && c.rank === 3));
    return {
      ...s,
      turn: first,
      log: `Round 1. ${name(first)} ${verb(first, 'have', 'has')} the ♦3 and ${verb(first, 'lead', 'leads')}.`,
    };
  }
  // Later rounds: the Daihinmin leads.
  const leader = lastPlaces.indexOf(PLAYERS - 1);
  s = { ...s, turn: leader, log: `Round ${round}. ${name(leader)} (Daihinmin) ${verb(leader, 'lead', 'leads')}.` };
  return rules.exchange ? startExchange(s) : s;
}

// ───────────────────────── card exchange ─────────────────────────

const strongestFirst = (h: readonly Card[]) => sortHand(h).toReversed();

function transfer(s: DaifugoState, from: number, to: number, cards: readonly Card[]): DaifugoState {
  const ids = new Set(cards.map((c) => c.id));
  const hands = s.hands.map((h, p) => {
    if (p === from) return h.filter((c) => !ids.has(c.id));
    if (p === to) return sortHand([...h, ...cards]).map((c) => ({ ...c, faceUp: p === HUMAN }));
    return h;
  });
  return { ...s, hands };
}

/** Lower ranks hand over their strongest cards; the upper ranks then give back cards of their choice. */
function startExchange(s: DaifugoState): DaifugoState {
  const at = (place: number) => s.lastPlaces!.indexOf(place);
  const [daifugo, fugo, hinmin, daihinmin] = [at(0), at(1), at(2), at(3)];
  let next = transfer(s, daihinmin, daifugo, strongestFirst(s.hands[daihinmin]!).slice(0, 2));
  next = transfer(next, hinmin, fugo, strongestFirst(next.hands[hinmin]!).slice(0, 1));
  next = {
    ...next,
    log: `${next.log} ${name(daihinmin)} gave 2 cards to ${name(daifugo)}; ${name(hinmin)} gave 1 to ${name(fugo)}.`,
  };
  return continueExchange({ ...next, phase: 'exchange' }, [
    { from: daifugo, to: daihinmin, count: 2 },
    { from: fugo, to: hinmin, count: 1 },
  ]);
}

function continueExchange(s: DaifugoState, gives: Give[]): DaifugoState {
  let next = s;
  // CPUs give back their weakest cards (never a Joker); the human's choice, if any, waits for input.
  for (const g of gives.filter((x) => x.from !== HUMAN)) {
    const give = sortHand(next.hands[g.from]!)
      .filter((c) => c.kind === 'standard')
      .slice(0, g.count);
    next = transfer(next, g.from, g.to, give);
  }
  const mine = gives.find((g) => g.from === HUMAN);
  if (mine) {
    return {
      ...next,
      phase: 'exchange',
      pendingGive: mine,
      log: `${next.log} Choose ${mine.count} card${mine.count > 1 ? 's' : ''} to give to ${name(mine.to)}.`,
    };
  }
  return { ...next, phase: 'play', pendingGive: null };
}

// ───────────────────────── actions ─────────────────────────

const describe = (cards: readonly Card[]) => cards.map((c) => (c.kind === 'joker' ? 'Joker' : rankLabel(c.rank))).join(' ');

function play(s: DaifugoState, by: number, ids: CardId[]): DaifugoState {
  const hand = s.hands[by]!;
  const cards = ids.map((id) => hand.find((c) => c.id === id));
  if (!ids.length || cards.some((c) => !c) || new Set(ids).size !== ids.length) return s;
  const played = (cards as Card[]).map((c) => ({ ...c, faceUp: true }));
  const shape = legalShape(s, played);
  if (!shape) return s;

  const counter = !!s.table?.jokersOnly && s.table.count === 1 && isSpade3(played);
  const lock =
    s.rules.lock &&
    !s.lock &&
    s.table &&
    !s.table.jokers &&
    !shape.jokers &&
    s.table.kind === shape.kind &&
    fitsLock(s.table.suits, shape)
      ? s.table.suits
      : s.lock;
  const hands = s.hands.map((h, p) => (p === by ? h.filter((c) => !ids.includes(c.id)) : h));
  const notes: string[] = [];
  if (lock && !s.lock)
    notes.push(`Locked to ${lock.map((x) => ({ spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' })[x]).join('')}!`);

  let next: DaifugoState = {
    ...s,
    hands,
    table: { ...shape, cards: played, by },
    cleared: s.table ? [...s.cleared, ...s.table.cards] : s.cleared,
    lock,
    log: `${name(by)} played ${describe(played)}.`,
  };

  const revolution =
    s.rules.revolution &&
    ((shape.kind === 'group' && shape.count >= 4) || (s.rules.stairRevolution && shape.kind === 'stairs' && shape.count >= 4));
  if (revolution) {
    next = { ...next, revolution: !s.revolution };
    notes.push(next.revolution ? 'Revolution!' : 'Counter-revolution!');
  }
  const jBack = s.rules.jBack && includesStrength(shape, S_JACK) && !revolution;
  if (jBack) {
    next = { ...next, jBack: !s.jBack };
    notes.push('J-back!');
  }
  if (notes.length) next = { ...next, log: `${next.log} ${notes.join(' ')}` };

  if (!hands[by]!.length) {
    if (isForbiddenFinish(s, played, shape, counter)) {
      next = {
        ...next,
        fallen: [...next.fallen, by],
        log: `${next.log} Forbidden finish — ${name(by)} ${verb(by, 'drop', 'drops')} to the bottom.`,
      };
    } else {
      next = { ...next, finished: [...next.finished, by], log: `${next.log} ${name(by)} ${verb(by, 'are', 'is')} out!` };
      next = applyMiyakoOchi(next, by);
    }
    next = endRoundIfDone(next);
    if (next.phase !== 'play') return next;
  }

  if (counter) return clearTrick(next, by, 'Spade 3 beats the Joker!');
  if (s.rules.eightCut && includesStrength(shape, S_EIGHT)) return clearTrick(next, by, '8-cut!');
  const turn = nextActive(next, by, true);
  if (turn === by) return clearTrick(next, by, 'No one can follow.');
  return { ...next, turn };
}

function reduce(s: DaifugoState, a: DaifugoAction): DaifugoState {
  if (a.type === 'nextRound') {
    if (s.phase !== 'roundOver') return s;
    return deal(s.rules, s.seed, s.round + 1, s.places, s.points);
  }
  if (a.type === 'give') {
    const g = s.pendingGive;
    if (s.phase !== 'exchange' || !g || a.by !== g.from || a.ids.length !== g.count) return s;
    const cards = a.ids.map((id) => s.hands[g.from]!.find((c) => c.id === id));
    if (cards.some((c) => !c) || new Set(a.ids).size !== a.ids.length) return s;
    const next = transfer(s, g.from, g.to, cards as Card[]);
    return {
      ...next,
      phase: 'play',
      pendingGive: null,
      log: `You gave ${describe(cards as Card[])} to ${name(g.to)}. ${name(s.turn)} ${verb(s.turn, 'lead', 'leads')}.`,
    };
  }
  if (s.phase !== 'play' || a.by !== s.turn || isOut(s, a.by)) return s;
  if (a.type === 'play') return play(s, a.by, a.ids);

  if (!s.table) return s; // the leader must play
  const next: DaifugoState = { ...s, passed: s.passed.map((p, i) => p || i === a.by), log: `${name(a.by)} passed.` };
  const turn = nextActive(next, a.by, true);
  // Back to whoever played last, or nobody left who hasn't passed: the trick is over.
  if (turn === s.table.by || turn === a.by) return clearTrick(next, s.table.by, 'Everyone passed.');
  return { ...next, turn };
}

// ───────────────────────── CPU ─────────────────────────

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [first!, ...c]), ...combinations(rest, k)];
}

/** Every distinct play the hand could make (groups, Joker groups, stairs). */
export function candidatePlays(s: DaifugoState, hand: readonly Card[]): Card[][] {
  const jokers = hand.filter((c) => c.kind === 'joker');
  const nat = hand.filter((c): c is StandardCard => c.kind === 'standard');
  const out: Card[][] = [];
  const byRank = new Map<number, StandardCard[]>();
  for (const c of nat) byRank.set(strengthOf(c), [...(byRank.get(strengthOf(c)) ?? []), c]);
  for (const cards of byRank.values()) {
    for (let k = 1; k <= cards.length; k++) {
      for (const combo of combinations(cards, k)) {
        out.push(combo);
        for (let j = 1; j <= jokers.length; j++) out.push([...combo, ...jokers.slice(0, j)]);
      }
    }
  }
  for (let j = 1; j <= jokers.length; j++) out.push(jokers.slice(0, j));
  if (s.rules.stairs) {
    for (const suit of SUITS) {
      const ranks = new Map(nat.filter((c) => c.suit === suit).map((c) => [strengthOf(c), c]));
      for (let lo = 0; lo <= 10; lo++) {
        for (let hi = lo + 2; hi <= 12; hi++) {
          const run: Card[] = [];
          let missing = 0;
          for (let r = lo; r <= hi; r++) {
            const c = ranks.get(r);
            if (c) run.push(c);
            else missing++;
          }
          if (missing <= jokers.length && run.length > 0) out.push([...run, ...jokers.slice(0, missing)]);
        }
      }
    }
  }
  return out;
}

/**
 * CPU strategy. Shedding cards matters more than hoarding them, so every level plays when it can.
 * - Easy: any legal play, and sometimes passes for no reason.
 * - Normal: the weakest play that works; sheds sets on the lead; keeps Jokers for the end.
 * - Hard: also keeps pairs and runs intact, cuts with an 8 to take the lead, leads with runs,
 *   and spends its strongest cards to stop a player who is about to go out.
 */
export function cpuMove(s: DaifugoState, p: number, level: CpuLevel = s.rules.cpu): DaifugoAction {
  if (s.phase === 'exchange') return { type: 'pass', by: p };
  const hand = s.hands[p]!;
  const rev = reversed(s);
  const legal = candidatePlays(s, hand)
    .map((cards) => ({ cards, shape: legalShape(s, cards) }))
    .filter((x): x is { cards: Card[]; shape: Shape } => !!x.shape);
  if (!legal.length) return { type: 'pass', by: p };
  const playOf = (x: { cards: Card[] }): DaifugoAction => ({ type: 'play', by: p, ids: x.cards.map((c) => c.id) });
  const key = hand.map((c) => c.id).join() + (s.table?.cards.map((c) => c.id).join() ?? '');
  if (level === 'easy') {
    if (s.table && pick(key, 4) === 0) return { type: 'pass', by: p };
    return playOf(legal[pick(key, legal.length)]!);
  }

  const finishing = (x: { cards: Card[] }) => x.cards.length === hand.length;
  const forbidden = (x: { cards: Card[]; shape: Shape }) => finishing(x) && isForbiddenFinish(s, x.cards, x.shape, false);
  const safeFinish = legal.find((x) => finishing(x) && !forbidden(x));
  if (safeFinish) return playOf(safeFinish);

  const hard = level === 'hard';
  const threat = hard && s.hands.some((h, q) => q !== p && !isOut(s, q) && h.length > 0 && h.length <= 2);
  const power = (x: { shape: Shape }) => (x.shape.jokersOnly ? 13 : rev ? 12 - x.shape.low : x.shape.low);
  const sameRank = (c: Card) =>
    hand.filter((h) => h.kind === 'standard' && c.kind === 'standard' && strengthOf(h) === strengthOf(c)).length;

  const cost = (x: { cards: Card[]; shape: Shape }) => {
    let v = power(x) * 10;
    if (!s.table) v -= x.cards.length * 8; // shed several cards at once when leading
    if (x.shape.jokers && hand.length > 4 && !threat) v += 60; // the Joker is worth more later
    if (threat) v -= power(x) * 20; // win this trick at all costs
    if (hard) {
      const natural = x.cards.find((c) => c.kind === 'standard');
      if (x.shape.kind === 'group' && natural && sameRank(natural) > x.cards.length) v += 35; // don't split a pair
      if (!s.table && x.shape.kind === 'stairs') v -= 25;
      if (s.table && s.rules.eightCut && !x.shape.jokers && includesStrength(x.shape, S_EIGHT)) v -= 45; // cut and lead
    }
    return v;
  };
  const options = legal.filter((x) => !forbidden(x));
  if (!options.length) return s.table ? { type: 'pass', by: p } : playOf(legal[0]!);
  const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  // Only the Joker would do and it's early: keep it.
  if (s.table && best.shape.jokers && hand.length > 4 && !threat) return { type: 'pass', by: p };
  return playOf(best);
}

// ───────────────────────── rules object ─────────────────────────

export function setup(rng: Rng, options: RuleOptions = {}): DaifugoState {
  return deal(readRules(options), nextSeed(rng), 1, null, [0, 0, 0, 0]);
}

export const placeOf = (s: DaifugoState, p: number) => (s.places ? s.places[p]! : placesOf(s)[p]!);

function hint(s: DaifugoState) {
  if (s.phase === 'exchange' && s.pendingGive?.from === HUMAN) {
    const give = sortHand(s.hands[HUMAN]!)
      .filter((c) => c.kind === 'standard')
      .slice(0, s.pendingGive.count);
    return { cards: give.map((c) => c.id), message: 'Give back your weakest cards.' };
  }
  if (s.phase !== 'play' || s.turn !== HUMAN) return null;
  // Advice always uses the strongest strategy, whatever the CPUs are set to.
  const move = cpuMove(s, HUMAN, 'hard');
  return move.type === 'play' ? { cards: move.ids } : { message: 'Nothing worth playing — pass.' };
}

export const daifugoRules: GameRules<DaifugoState, DaifugoAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (s.phase !== 'matchOver') return 'playing';
    return s.points[HUMAN]! >= Math.max(...s.points) ? 'won' : 'lost';
  },
  auto: (s) => {
    if (s.phase !== 'play' || s.turn === HUMAN || isOut(s, s.turn)) return null;
    return { action: cpuMove(s, s.turn), delayMs: 850 };
  },
  score: (s) => s.points[HUMAN]!,
  summary: (s) => s.points.map((pts, p) => `${name(p)} ${pts}`).join(' · '),
};
