import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { sortTrickHand, type TrickPlay } from '@/core/rules/trickTaking';
import { SUIT_SYMBOL, cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, drawSeats, pick, readLevel, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const HUMAN = 0;
export const CPU = 1;
export const TARGET = 66;

/** A 11, 10 10, K 4, Q 3, J 2. */
export const pointsOf = (c: StandardCard) => (c.rank === 1 ? 11 : c.rank === 10 ? 10 : c.rank === 13 ? 4 : c.rank === 12 ? 3 : 2);
/** Strength within a suit follows the points: A > 10 > K > Q > J. */
const strength = pointsOf;

export interface SchnapsenState {
  seat: CpuSeat;
  hands: [StandardCard[], StandardCard[]];
  talon: StandardCard[];
  /** Face-up trump card under the talon (null once drawn or the talon is gone). */
  trumpCard: StandardCard | null;
  trump: Suit;
  closedBy: number | null;
  leader: number;
  trick: TrickPlay[];
  points: [number, number];
  /** Marriage points waiting until their owner wins a trick. */
  pending: [number, number];
  tricksWon: [number, number];
  /** Marriage declared this lead: the card played must be its King or Queen. */
  marriage: Suit | null;
  phase: 'play' | 'dealOver' | 'matchOver';
  gamePoints: [number, number];
  dealer: number;
  lastResult: string;
  cpu: CpuLevel;
  seed: number;
  log: string;
}

export type SchnapsenAction =
  | { type: 'play'; by: number; id: CardId }
  | { type: 'marry'; by: number; suit: Suit }
  | { type: 'exchange'; by: number }
  | { type: 'close'; by: number }
  | { type: 'collect' }
  | { type: 'next' };

const DECK = () => createStandardDeck().filter((c) => c.rank === 1 || c.rank >= 10);

function deal(s: SchnapsenState, dealer: number): SchnapsenState {
  const rng = createRng(s.seed);
  const deck = shuffle(DECK(), rng);
  const leader = 1 - dealer;
  const hands: [StandardCard[], StandardCard[]] = [deck.slice(0, 5), deck.slice(5, 10)];
  const trumpCard = { ...deck[10]!, faceUp: true };
  return {
    ...s,
    hands: [sortTrickHand(hands[0]).map((c) => ({ ...c, faceUp: true })), hands[1]],
    talon: deck.slice(11),
    trumpCard,
    trump: trumpCard.suit,
    closedBy: null,
    leader,
    trick: [],
    points: [0, 0],
    pending: [0, 0],
    tricksWon: [0, 0],
    marriage: null,
    phase: 'play',
    dealer,
    seed: nextSeed(rng),
    log: `${SUIT_SYMBOL[trumpCard.suit]} is trump. ${leader === HUMAN ? 'You lead' : `${s.seat.name} leads`}.`,
  };
}

export function setup(rng: Rng, options: RuleOptions = {}): SchnapsenState {
  const seed = nextSeed(rng);
  const [seat] = drawSeats(rng, 1);
  const base = {
    seat: seat!,
    hands: [[], []] as [StandardCard[], StandardCard[]],
    talon: [],
    trumpCard: null,
    trump: 'hearts' as Suit,
    closedBy: null,
    leader: 0,
    trick: [],
    points: [0, 0] as [number, number],
    pending: [0, 0] as [number, number],
    tricksWon: [0, 0] as [number, number],
    marriage: null,
    phase: 'play' as const,
    gamePoints: [0, 0] as [number, number],
    dealer: 1,
    lastResult: '',
    cpu: readLevel(options),
    seed,
    log: '',
  };
  return deal(base, 1);
}

/** Strict rules apply once the talon is closed or exhausted: follow suit, head the trick, else trump. */
export const strict = (s: SchnapsenState) => s.closedBy !== null || (s.talon.length === 0 && !s.trumpCard);
export const toAct = (s: SchnapsenState) =>
  s.phase === 'play' && s.trick.length < 2 ? (s.trick.length ? 1 - s.leader : s.leader) : null;

export function beats(a: StandardCard, b: StandardCard, trump: Suit): boolean {
  if (b.suit === a.suit) return strength(b) > strength(a);
  return b.suit === trump;
}

export function legal(s: SchnapsenState, p: number): StandardCard[] {
  const hand = s.hands[p]!;
  if (!s.trick.length) {
    if (s.marriage) return hand.filter((c) => c.suit === s.marriage && (c.rank === 12 || c.rank === 13));
    return hand;
  }
  if (!strict(s)) return hand;
  const lead = s.trick[0]!.card;
  const follow = hand.filter((c) => c.suit === lead.suit);
  if (follow.length) {
    const higher = follow.filter((c) => strength(c) > strength(lead));
    return higher.length ? higher : follow;
  }
  const trumps = hand.filter((c) => c.suit === s.trump);
  return trumps.length ? trumps : hand;
}

export const marriages = (s: SchnapsenState, p: number): Suit[] =>
  toAct(s) !== p || s.trick.length || s.marriage
    ? []
    : (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).filter((x) =>
        [12, 13].every((r) => s.hands[p]!.some((c) => c.suit === x && c.rank === r)),
      );

export const canExchange = (s: SchnapsenState, p: number) =>
  toAct(s) === p &&
  !s.trick.length &&
  !strict(s) &&
  !!s.trumpCard &&
  s.talon.length >= 2 &&
  s.hands[p]!.some((c) => c.suit === s.trump && c.rank === 11);

export const canClose = (s: SchnapsenState, p: number) =>
  toAct(s) === p && !s.trick.length && !strict(s) && s.talon.length >= 2 && !s.marriage;

const total = (s: SchnapsenState, p: number) => s.points[p]!;

/** Ends the deal: game points by how badly the loser did; a failed close costs the closer. */
function endDeal(s: SchnapsenState, winner: number, why: string): SchnapsenState {
  const loser = 1 - winner;
  let gp = s.tricksWon[loser] === 0 ? 3 : total(s, loser) < 33 ? 2 : 1;
  if (s.closedBy !== null && s.closedBy === loser) gp = Math.max(gp, 2);
  const gamePoints: [number, number] = [...s.gamePoints];
  gamePoints[winner]! += gp;
  const who = winner === HUMAN ? 'You win' : `${s.seat.name} wins`;
  const result = `${why} ${who} the deal (+${gp}).`;
  return { ...s, gamePoints, phase: Math.max(...gamePoints) >= 7 ? 'matchOver' : 'dealOver', lastResult: result, log: result };
}

function reduce(s: SchnapsenState, a: SchnapsenAction): SchnapsenState {
  switch (a.type) {
    case 'marry': {
      if (!marriages(s, a.by).includes(a.suit)) return s;
      const value = a.suit === s.trump ? 40 : 20;
      const next = { ...s, marriage: a.suit };
      const who = a.by === HUMAN ? 'You declare' : `${s.seat.name} declares`;
      if (s.tricksWon[a.by]) {
        const points: [number, number] = [...s.points];
        points[a.by]! += value;
        const after = { ...next, points, log: `${who} a marriage in ${SUIT_SYMBOL[a.suit]} (+${value}).` };
        return points[a.by]! >= TARGET ? endDeal(after, a.by, `${value} for the marriage makes ${points[a.by]}!`) : after;
      }
      const pending: [number, number] = [...s.pending];
      pending[a.by]! += value;
      return { ...next, pending, log: `${who} a marriage in ${SUIT_SYMBOL[a.suit]} (+${value} once a trick is won).` };
    }
    case 'exchange': {
      if (!canExchange(s, a.by)) return s;
      const jack = s.hands[a.by]!.find((c) => c.suit === s.trump && c.rank === 11)!;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      const gained = { ...s.trumpCard!, faceUp: a.by === HUMAN };
      hands[a.by] = [...hands[a.by]!.filter((c) => c.id !== jack.id), gained];
      if (a.by === HUMAN) hands[0] = sortTrickHand(hands[0]);
      return {
        ...s,
        hands,
        trumpCard: { ...jack, faceUp: true },
        log: `${a.by === HUMAN ? 'You swap' : `${s.seat.name} swaps`} the trump Jack for the ${cardLabel(s.trumpCard!)}.`,
      };
    }
    case 'close':
      return canClose(s, a.by)
        ? { ...s, closedBy: a.by, log: `${a.by === HUMAN ? 'You close' : `${s.seat.name} closes`} the talon — strict rules now.` }
        : s;
    case 'play': {
      if (toAct(s) !== a.by) return s;
      const card = legal(s, a.by).find((c) => c.id === a.id);
      if (!card) return s;
      const hands: [StandardCard[], StandardCard[]] = [s.hands[0], s.hands[1]];
      hands[a.by] = hands[a.by]!.filter((c) => c.id !== a.id);
      return { ...s, hands, marriage: null, trick: [...s.trick, { by: a.by, card: { ...card, faceUp: true } }] };
    }
    case 'collect': {
      if (s.trick.length !== 2) return s;
      const [lead, reply] = s.trick as [TrickPlay, TrickPlay];
      const w = beats(lead.card, reply.card, s.trump) ? reply.by : lead.by;
      const points: [number, number] = [...s.points];
      points[w]! += pointsOf(lead.card) + pointsOf(reply.card) + s.pending[w]!;
      const pending: [number, number] = [...s.pending];
      pending[w] = 0;
      const tricksWon: [number, number] = [...s.tricksWon];
      tricksWon[w]! += 1;
      let next: SchnapsenState = { ...s, trick: [], leader: w, points, pending, tricksWon };
      if (points[w]! >= TARGET) return endDeal(next, w, `${points[w]} points!`);
      // Draw from the talon: winner first; the face-up trump card is the very last card.
      if (!strict(next)) {
        const draw = (p: number, n: SchnapsenState): SchnapsenState => {
          const hands: [StandardCard[], StandardCard[]] = [n.hands[0], n.hands[1]];
          if (n.talon.length) {
            const card = n.talon.at(-1)!;
            hands[p] = [...hands[p]!, { ...card, faceUp: p === HUMAN }];
            return { ...n, hands, talon: n.talon.slice(0, -1) };
          }
          if (n.trumpCard) {
            hands[p] = [...hands[p]!, { ...n.trumpCard, faceUp: p === HUMAN }];
            return { ...n, hands, trumpCard: null };
          }
          return n;
        };
        next = draw(1 - w, draw(w, next));
        next = { ...next, hands: [sortTrickHand(next.hands[0]), next.hands[1]] };
      }
      if (!next.hands[0].length && !next.hands[1].length) {
        // Last trick decides when nobody reached 66 (a failed close loses for the closer).
        const winner = s.closedBy !== null ? 1 - s.closedBy : w;
        return endDeal(next, winner, s.closedBy !== null ? 'The closer fell short.' : 'Last trick.');
      }
      return {
        ...next,
        log: `${w === HUMAN ? 'You take' : `${s.seat.name} takes`} the trick (${pointsOf(lead.card) + pointsOf(reply.card)}).`,
      };
    }
    case 'next':
      return s.phase === 'dealOver' ? deal(s, 1 - s.dealer) : s;
  }
}

export function cpuAct(s: SchnapsenState, level: CpuLevel = s.cpu): SchnapsenAction {
  const p = CPU;
  if (canExchange(s, p)) return { type: 'exchange', by: p };
  const m = marriages(s, p);
  if (m.length) return { type: 'marry', by: p, suit: m.includes(s.trump) ? s.trump : m[0]! };
  const risk = TRAITS[s.seat.personality].risk;
  if (
    canClose(s, p) &&
    level !== 'easy' &&
    s.points[p]! + s.pending[p]! >= 46 - risk * 10 &&
    s.hands[p]!.filter((c) => c.suit === s.trump || c.rank === 1).length >= 3
  )
    return { type: 'close', by: p };
  const options = legal(s, p);
  const id = (c: StandardCard) => ({ type: 'play' as const, by: p, id: c.id });
  if (level === 'easy' && pick(`${s.seed}${s.talon.length}${options.length}`, 3) === 0) return id(options[0]!);
  const low = (cs: StandardCard[]) =>
    cs.reduce((a, b) => ((b.suit === s.trump ? 20 : 0) + pointsOf(b) < (a.suit === s.trump ? 20 : 0) + pointsOf(a) ? b : a));
  if (!s.trick.length) {
    // Lead a low non-trump; keep the marriage partners and trumps.
    const keep = (c: StandardCard) =>
      (c.rank === 12 || c.rank === 13) && s.hands[p]!.some((x) => x.suit === c.suit && x.rank === 25 - c.rank);
    const plain = options.filter((c) => c.suit !== s.trump && !keep(c));
    return id(low(plain.length ? plain : options));
  }
  const lead = s.trick[0]!.card;
  const winners = options.filter((c) => beats(lead, c, s.trump));
  // Take a valuable lead cheaply; otherwise throw something worthless.
  if (winners.length && (pointsOf(lead) >= 10 || level === 'hard' || strict(s))) return id(low(winners));
  return id(low(options.filter((c) => !winners.includes(c)).length ? options.filter((c) => !winners.includes(c)) : options));
}

function hint(s: SchnapsenState): Hint | null {
  if (toAct(s) !== HUMAN) return null;
  const mirror = {
    ...s,
    hands: [s.hands[1], s.hands[0]] as [StandardCard[], StandardCard[]],
    points: [s.points[1], s.points[0]] as [number, number],
    pending: [s.pending[1], s.pending[0]] as [number, number],
    tricksWon: [s.tricksWon[1], s.tricksWon[0]] as [number, number],
    leader: 1 - s.leader,
    trick: s.trick.map((t) => ({ ...t, by: 1 - t.by })),
  };
  const a = cpuAct(mirror, 'hard');
  if (a.type === 'play') return { cards: [a.id] };
  return {
    message:
      a.type === 'marry'
        ? `Declare your marriage in ${SUIT_SYMBOL[a.suit]}.`
        : a.type === 'exchange'
          ? 'Swap your trump Jack for the trump card.'
          : 'Close the talon.',
  };
}

export const schnapsenRules: GameRules<SchnapsenState, SchnapsenAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (s.phase !== 'matchOver' ? 'playing' : s.gamePoints[0] > s.gamePoints[1] ? 'won' : 'lost'),
  auto: (s) => {
    if (s.phase !== 'play') return null;
    if (s.trick.length === 2) return { action: { type: 'collect' }, delayMs: 900 };
    if (toAct(s) !== CPU) return null;
    const action = cpuAct(s);
    return { action, delayMs: 300 + tempo(s.seat.personality, s.cpu, action.type === 'close') };
  },
  score: (s) => s.gamePoints[0],
  summary: (s) => `Game points: you ${s.gamePoints[0]} – ${s.gamePoints[1]} ${s.seat.name} (first to 7).`,
};
