import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type CardId, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, personalityOf, pick, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;
export const LIMIT = 99;
export const LIVES = 3;

/** How a flexible card is played: Ace +1/+11, ten +10/−10. */
export type Choice = 'low' | 'high';

export interface NinetyNineState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  stock: StandardCard[];
  pile: StandardCard[];
  total: number;
  dir: 1 | -1;
  turn: number;
  lives: number[];
  /** Set when someone just went over: the next round is dealt after a pause. */
  busted: number | null;
  round: number;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type NinetyNineAction =
  { type: 'play'; by: number; id: CardId; choice?: Choice } | { type: 'bust'; by: number } | { type: 'deal' };

/** New total after playing `card` (null when it would go over 99). */
export function apply(total: number, card: StandardCard, choice: Choice = 'high'): number | null {
  let t: number;
  switch (card.rank) {
    case 1:
      t = total + (choice === 'low' ? 1 : 11);
      break;
    case 4:
    case 9:
      t = total;
      break;
    case 10:
      t = Math.max(0, total + (choice === 'low' ? -10 : 10));
      break;
    case 11:
    case 12:
      t = total + 10;
      break;
    case 13:
      t = LIMIT;
      break;
    default:
      t = total + card.rank;
  }
  return t <= LIMIT ? t : null;
}

export const choicesFor = (card: StandardCard): Choice[] => (card.rank === 1 || card.rank === 10 ? ['high', 'low'] : ['high']);
export const playable = (s: NinetyNineState, card: StandardCard) =>
  choicesFor(card).some((c) => apply(s.total, card, c) !== null);
const alive = (s: NinetyNineState, p: number) => s.lives[p]! > 0;

function nextAlive(s: NinetyNineState, from: number, dir: 1 | -1): number {
  for (let k = 1; k <= PLAYERS; k++) {
    const q = (((from + dir * k) % PLAYERS) + PLAYERS) % PLAYERS;
    if (alive(s, q)) return q;
  }
  return from;
}

function dealRound(s: NinetyNineState, starter: number): NinetyNineState {
  const rng = createRng(s.seed);
  const deck = shuffle(createStandardDeck(), rng);
  const hands = s.lives.map((l, p) => (l > 0 ? deck.splice(-3).map((c) => ({ ...c, faceUp: p === HUMAN })) : []));
  return {
    ...s,
    hands,
    stock: deck,
    pile: [],
    total: 0,
    dir: 1,
    turn: starter,
    busted: null,
    round: s.round + 1,
    seed: nextSeed(rng),
    log: `Round ${s.round + 1}. ${seatName(s.seats, starter)} ${starter === HUMAN ? 'start' : 'starts'} at 0.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): NinetyNineState {
  const seed = nextSeed(rng);
  const base: NinetyNineState = {
    seats: drawSeats(rng, PLAYERS - 1),
    hands: [],
    stock: [],
    pile: [],
    total: 0,
    dir: 1,
    turn: 0,
    lives: [LIVES, LIVES, LIVES, LIVES],
    busted: null,
    round: 0,
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return dealRound(base, 0);
}

function reduce(s: NinetyNineState, a: NinetyNineAction): NinetyNineState {
  if (a.type === 'deal') {
    if (s.busted === null) return s;
    return dealRound(s, alive(s, s.busted) ? s.busted : nextAlive(s, s.busted, 1));
  }
  if (s.busted !== null || a.by !== s.turn) return s;
  if (a.type === 'bust') {
    if (s.hands[a.by]!.some((c) => playable(s, c))) return s;
    const lives = s.lives.map((l, p) => (p === a.by ? l - 1 : l));
    const who = seatName(s.seats, a.by);
    return {
      ...s,
      lives,
      busted: a.by,
      hands: s.hands.map((h, p) => (p === a.by ? h.map((c) => ({ ...c, faceUp: true })) : h)),
      log: `${who} cannot stay under 100 and ${a.by === HUMAN ? 'lose' : 'loses'} a life${lives[a.by] ? '' : ' — and is out!'}`,
    };
  }
  const card = s.hands[a.by]!.find((c) => c.id === a.id);
  if (!card) return s;
  const total = apply(s.total, card, a.choice);
  if (total === null) return s;
  let stock = s.stock,
    pile = [...s.pile, { ...card, faceUp: true }];
  if (!stock.length) {
    // Reshuffle the played cards (all but the last) to keep drawing.
    const rng = createRng(s.seed);
    stock = shuffle(pile.slice(0, -1), rng).map((c) => ({ ...c, faceUp: false }));
    pile = pile.slice(-1);
  }
  const drawn = stock.at(-1);
  const hand = [...s.hands[a.by]!.filter((c) => c.id !== a.id), ...(drawn ? [{ ...drawn, faceUp: a.by === HUMAN }] : [])];
  const dir = card.rank === 4 ? (-s.dir as 1 | -1) : s.dir;
  const next = {
    ...s,
    hands: s.hands.map((h, p) => (p === a.by ? hand : h)),
    stock: stock.slice(0, -1),
    pile,
    total,
    dir,
    seed: s.seed + 1,
  };
  const effect = card.rank === 4 ? ' (reverse)' : card.rank === 9 ? ' (pass)' : card.rank === 13 ? ' (straight to 99!)' : '';
  return {
    ...next,
    turn: nextAlive(next, a.by, dir),
    log: `${seatName(s.seats, a.by)} ${a.by === HUMAN ? 'play' : 'plays'} ${cardLabel(card)}${effect} — ${total}.`,
  };
}

const special = (c: StandardCard) => [13, 9, 4, 10].includes(c.rank);

/** Normal play: spend plain cards first, saving K, 9, 4 and 10 for when the count is high. */
export function cpuMove(s: NinetyNineState, p: number, level: CpuLevel = s.cpu): NinetyNineAction {
  const hand = s.hands[p]!;
  const options = hand.flatMap((c) =>
    choicesFor(c)
      .filter((ch) => apply(s.total, c, ch) !== null)
      .map((ch) => ({ card: c, choice: ch, total: apply(s.total, c, ch)! })),
  );
  if (!options.length) return { type: 'bust', by: p };
  if (level === 'easy') {
    const o = options[pick(`${s.seed}${p}`, options.length)]!;
    return { type: 'play', by: p, id: o.card.id, choice: o.choice };
  }
  const risk = TRAITS[personalityOf(s.seats, p)].risk;
  const score = (o: (typeof options)[number]) => {
    let v = 0;
    if (special(o.card)) v -= LIMIT - s.total > 12 ? 30 : 0; // keep escapes while it's safe
    v += o.total * (0.3 + risk * 0.4); // push the count up for the next player
    if (o.total === LIMIT && level === 'hard') v += 15;
    if (o.card.rank === 10 && o.choice === 'low') v -= 5;
    return v;
  };
  const best = options.reduce((a, b) => (score(b) > score(a) ? b : a));
  return { type: 'play', by: p, id: best.card.id, choice: best.choice };
}

const aliveCount = (s: NinetyNineState) => s.lives.filter((l) => l > 0).length;

export const ninetyNineRules: GameRules<NinetyNineState, NinetyNineAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.turn !== HUMAN || s.busted !== null) return null;
    const a = cpuMove(s, HUMAN, 'hard');
    if (a.type !== 'play') return { message: 'Nothing fits.' };
    return a.choice === 'low' ? { cards: [a.id], message: 'Play it low.' } : { cards: [a.id] };
  },
  status: (s) => (!alive(s, HUMAN) ? 'lost' : aliveCount(s) === 1 ? 'won' : 'playing'),
  auto: (s) => {
    if (s.busted !== null) return { action: { type: 'deal' }, delayMs: 1600 };
    const stuck = !s.hands[s.turn]!.some((c) => playable(s, c));
    if (s.turn === HUMAN) return stuck ? { action: { type: 'bust', by: HUMAN }, delayMs: 900 } : null;
    const action = cpuMove(s, s.turn);
    return { action, delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, s.total >= 90, `${s.seed}`) };
  },
  score: (s) => s.lives[HUMAN]!,
  summary: (s) => (alive(s, HUMAN) ? 'You are the last player standing!' : `You ran out of lives in round ${s.round}.`),
};
