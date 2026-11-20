import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUITS, rankLabel, type CardId, type Rank, type StandardCard } from '@/core/types/card';
import type { GameRules, Hint, RuleOptions } from '@/core/types/game';
import { TRAITS, chance, drawSeats, personalityOf, readLevel, seatName, tempo, type CpuLevel, type CpuSeat } from '../cpuLevel';

export const PLAYERS = 4;
export const HUMAN = 0;

export interface Claim {
  by: number;
  ids: CardId[];
  rank: number;
}

export interface DoubtState {
  seats: CpuSeat[];
  hands: StandardCard[][];
  /** Centre pile, face down (revealed cards are flipped up during a challenge). */
  pile: StandardCard[];
  /** Rank the current player must claim. */
  rank: number;
  turn: number;
  phase: 'play' | 'challenge' | 'reveal';
  claim: Claim | null;
  /** Seats still to accept or doubt the claim, in order. */
  responders: number[];
  challenger: number | null;
  winner: number | null;
  cpu: CpuLevel;
  log: string;
}

export type DoubtAction =
  { type: 'play'; by: number; ids: CardId[] } | { type: 'respond'; by: number; doubt: boolean } | { type: 'resolve' };

const sortHand = (h: StandardCard[]) => h.toSorted((a, b) => a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit));
const name = (s: DoubtState, p: number) => seatName(s.seats, p);
const label = (r: number) => rankLabel(r as Rank);

export function setup(rng: Rng, options: RuleOptions = {}): DoubtState {
  const deck = shuffle(createStandardDeck(), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) =>
    deck.slice(p * 13, p * 13 + 13).map((c) => ({ ...c, faceUp: p === HUMAN })),
  );
  return {
    seats: drawSeats(rng, PLAYERS - 1),
    hands: hands.map((h, p) => (p === HUMAN ? sortHand(h) : h)),
    pile: [],
    rank: 1,
    turn: HUMAN,
    phase: 'play',
    claim: null,
    responders: [],
    challenger: null,
    winner: null,
    cpu: readLevel(options),
    log: 'Play 1–4 cards face down as Aces. Lie if you must.',
  };
}

const nextSeat = (p: number) => (p + 1) % PLAYERS;

/** The claim stands: the claimant may have won, otherwise play moves on to the next rank. */
function accept(s: DoubtState): DoubtState {
  const c = s.claim!;
  if (!s.hands[c.by]!.length)
    return { ...s, winner: c.by, phase: 'play', log: `${s.log} ${name(s, c.by)} ${c.by === HUMAN ? 'are' : 'is'} out of cards!` };
  const rank = (c.rank % 13) + 1;
  const turn = nextSeat(c.by);
  return {
    ...s,
    phase: 'play',
    claim: null,
    responders: [],
    rank,
    turn,
    log: `${s.log} ${name(s, turn)} must play ${label(rank)}s.`,
  };
}

function reduce(s: DoubtState, a: DoubtAction): DoubtState {
  if (s.winner !== null) return s;
  switch (a.type) {
    case 'play': {
      if (s.phase !== 'play' || a.by !== s.turn || a.ids.length < 1 || a.ids.length > 4) return s;
      const cards = s.hands[a.by]!.filter((c) => a.ids.includes(c.id));
      if (cards.length !== a.ids.length) return s;
      const responders = [1, 2, 3].map((k) => (a.by + k) % PLAYERS);
      return {
        ...s,
        hands: s.hands.map((h, p) => (p === a.by ? h.filter((c) => !a.ids.includes(c.id)) : h)),
        pile: [...s.pile, ...cards.map((c) => ({ ...c, faceUp: false }))],
        claim: { by: a.by, ids: a.ids, rank: s.rank },
        phase: 'challenge',
        responders,
        log: `${name(s, a.by)} ${a.by === HUMAN ? 'play' : 'plays'} ${cards.length} × ${label(s.rank)}.`,
      };
    }
    case 'respond': {
      if (s.phase !== 'challenge' || s.responders[0] !== a.by) return s;
      if (a.doubt) {
        const ids = s.claim!.ids;
        return {
          ...s,
          phase: 'reveal',
          challenger: a.by,
          responders: [],
          pile: s.pile.map((c) => (ids.includes(c.id) ? { ...c, faceUp: true } : c)),
          log: `${name(s, a.by)}: “Doubt!”`,
        };
      }
      const rest = s.responders.slice(1);
      return rest.length ? { ...s, responders: rest } : accept({ ...s, responders: [] });
    }
    case 'resolve': {
      if (s.phase !== 'reveal') return s;
      const c = s.claim!;
      const shown = s.pile.filter((x) => c.ids.includes(x.id));
      const lie = shown.some((x) => x.rank !== c.rank);
      const loser = lie ? c.by : s.challenger!;
      const taken = s.pile.map((x) => ({ ...x, faceUp: loser === HUMAN }));
      const hands = s.hands.map((h, p) => (p === loser ? (p === HUMAN ? sortHand([...h, ...taken]) : [...h, ...taken]) : h));
      const next = {
        ...s,
        hands,
        pile: [],
        challenger: null,
        log: lie
          ? `It was a lie! ${name(s, c.by)} ${c.by === HUMAN ? 'pick' : 'picks'} up ${taken.length} cards.`
          : `Honest! ${name(s, loser)} ${loser === HUMAN ? 'pick' : 'picks'} up ${taken.length} cards.`,
      };
      return accept(next);
    }
  }
}

/** Cards to put down: every card of the rank (honest), maybe padded with a lie; otherwise a bluff. */
export function cpuPlay(s: DoubtState, p: number, level: CpuLevel = s.cpu): CardId[] {
  const hand = s.hands[p]!;
  const honest = hand.filter((c) => c.rank === s.rank);
  const traits = TRAITS[personalityOf(s.seats, p)];
  // How soon this player will be asked for each rank again: far-off ranks make the best lies.
  const wait = (c: StandardCard) => (((c.rank - s.rank + 13) % 13) - ((p - s.turn + PLAYERS) % PLAYERS) + 13) % 13;
  const liars = hand.filter((c) => c.rank !== s.rank).toSorted((a, b) => (level === 'easy' ? 0 : wait(a) - wait(b)));
  const key = `${p}${hand.length}${s.rank}${s.pile.length}`;
  if (honest.length) {
    const pad = liars.length && honest.length < 4 && chance(key) < traits.bluff * (level === 'hard' ? 0.5 : 0.35);
    return [...honest, ...(pad ? [liars.at(-1)!] : [])].map((c) => c.id);
  }
  const count = traits.risk > 0.6 && liars.length > 2 && chance(`${key}x`) < 0.4 ? 2 : 1;
  return liars.slice(-count).map((c) => c.id);
}

/** Should seat `p` call the current claim a lie? */
export function cpuDoubts(s: DoubtState, p: number, level: CpuLevel = s.cpu): boolean {
  const c = s.claim!;
  const held = s.hands[p]!.filter((x) => x.rank === c.rank).length;
  const key = `${p}${c.by}${s.pile.length}${c.rank}`;
  // Impossible claims are caught by anyone paying attention.
  if (held + c.ids.length > 4) return level === 'easy' ? chance(key) < 0.6 : true;
  if (!s.hands[c.by]!.length) return chance(key) < (level === 'easy' ? 0.5 : 0.85);
  const traits = TRAITS[personalityOf(s.seats, p)];
  let odds = traits.suspicion * 0.22 + (c.ids.length - 1) * 0.08 + held * 0.07;
  // A big pile makes doubting expensive; cautious players back off.
  odds -= Math.min(0.25, s.pile.length * 0.012) * (1 - traits.risk);
  if (level === 'easy') odds *= 0.6;
  return chance(key) < odds;
}

export const pendingResponder = (s: DoubtState) => (s.phase === 'challenge' ? (s.responders[0] ?? null) : null);

export const doubtRules: GameRules<DoubtState, DoubtAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    if (s.phase === 'play' && s.turn === HUMAN) {
      const ids = cpuPlay(s, HUMAN, 'hard');
      const honest = s.hands[HUMAN]!.some((c) => c.rank === s.rank);
      return {
        cards: ids,
        message: honest ? 'Play your real cards.' : 'You have none — bluff with a card you will not need soon.',
      };
    }
    if (pendingResponder(s) === HUMAN)
      return { message: cpuDoubts(s, HUMAN, 'hard') ? 'That sounds like a lie — Doubt!' : 'Probably true. Let it go.' };
    return null;
  },
  status: (s) => (s.winner === null ? 'playing' : s.winner === HUMAN ? 'won' : 'lost'),
  auto: (s) => {
    if (s.winner !== null) return null;
    if (s.phase === 'reveal') return { action: { type: 'resolve' }, delayMs: 1500 };
    const r = pendingResponder(s);
    if (r !== null) {
      if (r === HUMAN) return null;
      const doubt = cpuDoubts(s, r);
      return { action: { type: 'respond', by: r, doubt }, delayMs: doubt ? 420 + tempo(personalityOf(s.seats, r), s.cpu) : 220 };
    }
    if (s.turn === HUMAN) return null;
    const ids = cpuPlay(s, s.turn);
    // The tell: a bluffing CPU hesitates — unless it plays on Hard.
    const lying = s.hands[s.turn]!.filter((c) => ids.includes(c.id)).some((c) => c.rank !== s.rank);
    return {
      action: { type: 'play', by: s.turn, ids },
      delayMs: 300 + tempo(personalityOf(s.seats, s.turn), s.cpu, lying, `${s.pile.length}`),
    };
  },
  score: (s) => s.hands[HUMAN]!.length,
  summary: (s) =>
    s.winner === HUMAN ? 'You got rid of every card!' : `${seatName(s.seats, s.winner ?? 1)} emptied their hand first.`,
};
