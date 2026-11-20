import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { aceHigh, legalMoves, sortTrickHand, trickWinner, type TrickPlay } from '@/core/rules/trickTaking';
import { cardLabel, type CardId, type StandardCard } from '@/core/types/card';
import { isOn, type GameRules, type Hint, type RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
export const PASS_DIRS = ['left', 'right', 'across', 'none'] as const;

export interface HeartsState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  phase: 'pass' | 'play' | 'handOver' | 'matchOver';
  handNo: number;
  trick: TrickPlay[];
  leader: number;
  /** Penalty points taken this hand. */
  taken: number[];
  /** Every card played this hand (what a careful player remembers). */
  played: StandardCard[];
  broken: boolean;
  scores: number[];
  lastHand: number[] | null;
  target: number;
  passing: boolean;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type HeartsAction =
  { type: 'pass'; ids: CardId[] } | { type: 'play'; by: number; id: CardId } | { type: 'collect' } | { type: 'next' };

export const isQueen = (c: StandardCard) => c.suit === 'spades' && c.rank === 12;
export const pointsOf = (c: StandardCard) => (c.suit === 'hearts' ? 1 : isQueen(c) ? 13 : 0);
const isTwoClubs = (c: StandardCard) => c.suit === 'clubs' && c.rank === 2;
export const passDir = (s: HeartsState) => (s.passing ? PASS_DIRS[(s.handNo - 1) % 4]! : 'none');
const passTarget = (p: number, dir: (typeof PASS_DIRS)[number]) =>
  dir === 'left' ? (p + 1) % 4 : dir === 'right' ? (p + 3) % 4 : (p + 2) % 4;

function deal(s: HeartsState, handNo: number): HeartsState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) =>
    sortTrickHand(deck.slice(p * 13, p * 13 + 13)).map((c) => ({ ...c, faceUp: p === HUMAN })),
  );
  const next: HeartsState = {
    ...s,
    hands,
    handNo,
    trick: [],
    taken: [0, 0, 0, 0],
    played: [],
    broken: false,
    seed: nextSeed(rng),
    phase: 'pass',
  };
  const dir = passDir(next);
  if (dir === 'none') return startPlay(next, `Hand ${handNo}: no passing this time.`);
  return { ...next, log: `Hand ${handNo}: choose three cards to pass ${dir}.` };
}

function startPlay(s: HeartsState, head: string): HeartsState {
  const leader = s.hands.findIndex((h) => h.some(isTwoClubs));
  return {
    ...s,
    phase: 'play',
    leader,
    log: `${head} ${seatName(s.seats, leader)} ${leader === HUMAN ? 'lead' : 'leads'} the 2♣.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): HeartsState {
  const seed = nextSeed(rng);
  const base: HeartsState = {
    seats: drawSeats(rng, PLAYERS - 1),
    hands: [],
    phase: 'pass',
    handNo: 1,
    trick: [],
    leader: 0,
    taken: [0, 0, 0, 0],
    played: [],
    broken: false,
    scores: [0, 0, 0, 0],
    lastHand: null,
    target: options.target === '50' ? 50 : 100,
    passing: options.passing === undefined ? true : isOn(options, 'passing'),
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1);
}

export const toAct = (s: HeartsState) => (s.phase === 'play' && s.trick.length < 4 ? (s.leader + s.trick.length) % 4 : null);
const firstTrick = (s: HeartsState) => s.played.length < 4;

export function legal(s: HeartsState, p: number): StandardCard[] {
  const hand = s.hands[p]!;
  if (firstTrick(s) && !s.trick.length) return hand.filter(isTwoClubs);
  return legalMoves(hand, s.trick[0]?.card.suit ?? null, {
    unbrokenSuit: s.broken ? null : 'hearts',
    ...(firstTrick(s) ? { forbidden: (c: StandardCard) => pointsOf(c) > 0 } : {}),
  });
}

/** Three cards a CPU passes: the Queen and big spades first, then high hearts, then its highest cards. */
export function cpuPass(s: HeartsState, p: number): StandardCard[] {
  const hand = s.hands[p]!;
  const spades = hand.filter((c) => c.suit === 'spades').length;
  const danger = (c: StandardCard) => {
    if (isQueen(c)) return 100;
    if (c.suit === 'spades' && aceHigh(c) > 12) return spades >= 5 ? 0 : 90;
    if (c.suit === 'hearts') return 40 + aceHigh(c);
    return aceHigh(c) + (hand.filter((x) => x.suit === c.suit).length <= 2 ? 10 : 0);
  };
  return hand.toSorted((a, b) => danger(b) - danger(a)).slice(0, 3);
}

const high = (cs: StandardCard[]) => cs.reduce((a, b) => (aceHigh(b) > aceHigh(a) ? b : a));
const low = (cs: StandardCard[]) => cs.reduce((a, b) => (aceHigh(b) < aceHigh(a) ? b : a));

/** CPU card choice. Easy plays any legal card; Normal and Hard duck points and dump danger when void. */
export function cpuMove(s: HeartsState, p: number, level: CpuLevel = s.cpu): StandardCard {
  const options = legal(s, p);
  if (options.length === 1) return options[0]!;
  if (level === 'easy' && pick(`${s.seed}${p}${s.played.length}`, 3) === 0)
    return options[pick(`${s.played.length}${p}`, options.length)]!;
  const queenOut = s.played.some(isQueen) || s.hands[p]!.some(isQueen);
  // Shooting the moon: a bold (or Hard) player who has taken every point so far keeps winning.
  const pointsSoFar = s.taken.reduce((a, b) => a + b, 0);
  const moon =
    s.taken[p]! >= 12 && s.taken[p] === pointsSoFar && (TRAITS[personalityOf(s.seats, p)].risk > 0.6 || level === 'hard');
  if (!s.trick.length) {
    if (moon) return high(options);
    // Lead low from a short suit; avoid leading spades into the Queen while holding A/K of spades.
    const safe = options.filter(
      (c) => !(c.suit === 'spades' && aceHigh(c) >= 12 && !s.played.some(isQueen)) && c.suit !== 'hearts',
    );
    const pool = safe.length ? safe : options;
    const len = (c: StandardCard) => s.hands[p]!.filter((x) => x.suit === c.suit).length;
    return pool.reduce((a, b) => (len(b) * 20 + aceHigh(b) < len(a) * 20 + aceHigh(a) ? b : a));
  }
  const lead = s.trick[0]!.card.suit;
  const following = options[0]!.suit === lead;
  if (!following) {
    // Void: dump the Queen, then high spades while she's out there, then hearts, then the highest card.
    const queen = options.find(isQueen);
    if (queen && !moon) return queen;
    const bigSpade = options.filter((c) => c.suit === 'spades' && aceHigh(c) > 12);
    if (bigSpade.length && !queenOut) return high(bigSpade);
    const hearts = options.filter((c) => c.suit === 'hearts');
    if (moon) return low(options);
    return hearts.length ? high(hearts) : high(options);
  }
  const best = trickWinner(s.trick, null);
  const winsWith = (c: StandardCard) => trickWinner([...s.trick, { by: p, card: c }], null).by === p;
  const ducks = options.filter((c) => !winsWith(c));
  const trickPoints = s.trick.reduce((n, t) => n + pointsOf(t.card), 0);
  if (moon) return high(options);
  if (s.trick.length === 3 && trickPoints === 0) {
    // Last to play with a clean trick: win it with the highest card (unless that's the Queen).
    const safe = options.filter((c) => !isQueen(c));
    return safe.length ? high(safe) : low(options);
  }
  if (ducks.length) {
    // Play the highest card that still loses, keeping the Queen off a spade trick someone else wins.
    const q = ducks.find(isQueen);
    if (q && level !== 'easy' && best.by !== p) return q;
    return high(ducks);
  }
  return level === 'hard'
    ? high(options.filter((c) => !isQueen(c)).length ? options.filter((c) => !isQueen(c)) : options)
    : low(options);
}

function reduce(s: HeartsState, a: HeartsAction): HeartsState {
  switch (a.type) {
    case 'pass': {
      if (s.phase !== 'pass' || a.ids.length !== 3) return s;
      const mine = s.hands[HUMAN]!.filter((c) => a.ids.includes(c.id));
      if (mine.length !== 3) return s;
      const dir = passDir(s);
      const outgoing = s.hands.map((_, p) => (p === HUMAN ? mine : cpuPass(s, p)));
      const hands = s.hands.map((h, p) => h.filter((c) => !outgoing[p]!.includes(c)));
      outgoing.forEach((cards, p) => hands[passTarget(p, dir)]!.push(...cards));
      const received = outgoing[passTarget(HUMAN, dir === 'left' ? 'right' : dir === 'right' ? 'left' : 'across')]!;
      const fixed = hands.map((h, p) => sortTrickHand(h).map((c) => ({ ...c, faceUp: p === HUMAN })));
      return startPlay({ ...s, hands: fixed }, `You received ${received.map(cardLabel).join(' ')}.`);
    }
    case 'play': {
      if (toAct(s) !== a.by) return s;
      const card = legal(s, a.by).find((c) => c.id === a.id);
      if (!card) return s;
      const shown = { ...card, faceUp: true };
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => c.id !== a.id) : h)),
        trick: [...s.trick, { by: a.by, card: shown }],
        played: [...s.played, shown],
        broken: s.broken || card.suit === 'hearts',
        log:
          card.suit !== (s.trick[0]?.card.suit ?? card.suit) && card.suit === 'hearts' && !s.broken
            ? 'Hearts are broken!'
            : s.log,
      };
    }
    case 'collect': {
      if (s.trick.length !== 4) return s;
      const w = trickWinner(s.trick, null).by;
      const pts = s.trick.reduce((n, t) => n + pointsOf(t.card), 0);
      const taken = s.taken.map((t, p) => (p === w ? t + pts : t));
      const next = {
        ...s,
        trick: [],
        leader: w,
        taken,
        log: `${seatName(s.seats, w)} ${w === HUMAN ? 'take' : 'takes'} the trick${pts ? ` (+${pts})` : ''}.`,
      };
      if (s.hands[0]!.length) return next;
      // Hand over: score it, with the moon shot turning the tables.
      const shooter = taken.findIndex((t) => t === 26);
      const delta = shooter >= 0 ? taken.map((_, p) => (p === shooter ? 0 : 26)) : taken;
      const scores = s.scores.map((sc, p) => sc + delta[p]!);
      const over = scores.some((x) => x >= s.target);
      return {
        ...next,
        scores,
        lastHand: delta,
        phase: over ? 'matchOver' : 'handOver',
        log: shooter >= 0 ? `${seatName(s.seats, shooter)} shot the moon!` : `Hand ${s.handNo} scored.`,
      };
    }
    case 'next':
      return s.phase === 'handOver' ? deal(s, s.handNo + 1) : s;
  }
}

function hint(s: HeartsState): Hint | null {
  if (s.phase === 'pass') return { cards: cpuPass(s, HUMAN).map((c) => c.id), message: 'Pass your most dangerous cards.' };
  if (toAct(s) !== HUMAN) return null;
  return { cards: [cpuMove(s, HUMAN, 'hard').id] };
}

export const heartsRules: GameRules<HeartsState, HeartsAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.scores[HUMAN]! <= Math.min(...s.scores) ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase !== 'play') return null;
    if (s.trick.length === 4) return { action: { type: 'collect' }, delayMs: 1000 };
    const p = toAct(s);
    if (p === null || p === HUMAN) return null;
    const card = cpuMove(s, p);
    const tense =
      isQueen(card) ||
      (s.trick.length > 0 &&
        card.suit === s.trick[0]!.card.suit &&
        trickWinner([...s.trick, { by: p, card }], null).by === p &&
        s.trick.some((t) => pointsOf(t.card)));
    return {
      action: { type: 'play', by: p, id: card.id },
      delayMs: 260 + tempo(personalityOf(s.seats, p), s.cpu, tense, `${s.seed}${s.played.length}`),
    };
  },
  score: (s) => s.scores[HUMAN]!,
  summary: (s) => s.scores.map((x, p) => `${seatName(s.seats, p)} ${x}`).join(' · ') + ' (lowest wins)',
};
