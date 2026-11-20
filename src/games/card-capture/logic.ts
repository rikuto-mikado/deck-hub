import { createDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { cardLabel, type Card, type CardId, type Suit } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export const ROW = 4;
export const HAND = 4;
export const TORCHES = 5;

export interface CaptureState {
  /** Enemy cards still to come; the end is the top. */
  enemies: Card[];
  dungeon: (Card | null)[];
  deck: Card[];
  hand: Card[];
  discard: Card[];
  /** Cards sacrificed to banish enemies leave the game. */
  trashed: Card[];
  royals: number;
  torches: number;
  /** Did anything happen this turn? Ending an idle turn costs a torch. */
  acted: boolean;
  seed: number;
  log: string;
}

export type CaptureAction =
  { type: 'capture'; target: number; ids: CardId[] } | { type: 'banish'; target: number; id: CardId } | { type: 'end' };

const up = (c: Card): Card => ({ ...c, faceUp: true });
const isRoyal = (c: Card) => c.kind === 'standard' && c.rank >= 11;

/** Strength of an enemy: its rank (J 11, Q 12, K 13); a Joker is 14 and can be fought with any suits. */
export const enemyValue = (c: Card) => (c.kind === 'joker' ? 14 : c.rank);
/** Attack value of a card in hand: A–6 face value, captured cards their rank; a captured Joker is 7 of any suit. */
export const handValue = (c: Card) => (c.kind === 'joker' ? 7 : c.rank);

export function setup(rng: Rng): CaptureState {
  const all = createDeck({ jokers: 2 });
  const start = shuffle(
    all.filter((c) => c.kind === 'standard' && c.rank <= 6),
    rng,
  );
  const enemies = shuffle(
    all.filter((c) => c.kind === 'joker' || c.rank >= 7),
    rng,
  );
  const dungeon = enemies.splice(-ROW).map(up);
  const hand = start.splice(-HAND).map(up);
  return {
    enemies,
    dungeon,
    deck: start,
    hand,
    discard: [],
    trashed: [],
    royals: 0,
    torches: TORCHES,
    acted: false,
    seed: nextSeed(rng),
    log: 'Capture an enemy with cards of its suit worth at least its rank.',
  };
}

export function canCapture(target: Card, cards: readonly Card[]): boolean {
  if (!cards.length) return false;
  const total = cards.reduce((n, c) => n + handValue(c), 0);
  if (total < enemyValue(target)) return false;
  if (target.kind === 'joker') return true;
  const suit: Suit = target.suit;
  return cards.every((c) => c.kind === 'joker' || c.suit === suit);
}

export const canBanish = (card: Card) => card.kind === 'standard' && card.rank <= 3;

function reduce(s: CaptureState, a: CaptureAction): CaptureState {
  switch (a.type) {
    case 'capture': {
      const target = s.dungeon[a.target];
      const cards = s.hand.filter((c) => a.ids.includes(c.id));
      if (!target || cards.length !== a.ids.length || !canCapture(target, cards)) return s;
      return {
        ...s,
        dungeon: s.dungeon.map((d, i) => (i === a.target ? null : d)),
        hand: s.hand.filter((c) => !a.ids.includes(c.id)),
        discard: [...s.discard, ...cards, target],
        royals: s.royals + (isRoyal(target) ? 1 : 0),
        torches: target.kind === 'joker' ? Math.min(TORCHES, s.torches + 1) : s.torches,
        acted: true,
        log: `Captured ${cardLabel(target)}!${target.kind === 'joker' ? ' A torch flares back to life.' : ''}`,
      };
    }
    case 'banish': {
      const target = s.dungeon[a.target];
      const card = s.hand.find((c) => c.id === a.id);
      if (!target || !card || !canBanish(card)) return s;
      return {
        ...s,
        dungeon: s.dungeon.map((d, i) => (i === a.target ? null : d)),
        enemies: [{ ...target, faceUp: false }, ...s.enemies],
        hand: s.hand.filter((c) => c.id !== a.id),
        trashed: [...s.trashed, card],
        acted: true,
        log: `Sacrificed ${cardLabel(card)} to banish ${cardLabel(target)} to the bottom of the dungeon.`,
      };
    }
    case 'end': {
      let deck = s.deck.slice(),
        discard = [...s.discard, ...s.hand];
      const rng = createRng(s.seed);
      const hand: Card[] = [];
      while (hand.length < HAND) {
        if (!deck.length) {
          if (!discard.length) break;
          deck = shuffle(discard, rng).map((c) => ({ ...c, faceUp: false }));
          discard = [];
        }
        hand.push(up(deck.pop()!));
      }
      const enemies = s.enemies.slice();
      const dungeon = s.dungeon.map((d) => d ?? (enemies.length ? up(enemies.pop()!) : null));
      const torches = s.acted ? s.torches : s.torches - 1;
      return {
        ...s,
        deck,
        discard,
        hand,
        enemies,
        dungeon,
        torches,
        acted: false,
        seed: nextSeed(rng),
        log: s.acted ? 'New turn. The dungeon refills.' : `You did nothing — a torch gutters out (${torches} left).`,
      };
    }
  }
}

const royalsLeft = (s: CaptureState) => 12 - s.royals;

/** Best capture this turn: the strongest enemy you can take with the fewest card points. */
export function bestCapture(s: CaptureState): { target: number; ids: CardId[] } | null {
  let best: { target: number; ids: CardId[]; score: number } | null = null;
  const n = s.hand.length;
  s.dungeon.forEach((t, ti) => {
    if (!t) return;
    for (let mask = 1; mask < 1 << n; mask++) {
      const cards = s.hand.filter((_, i) => mask & (1 << i));
      if (!canCapture(t, cards)) continue;
      const cost = cards.reduce((x, c) => x + handValue(c), 0);
      const score = enemyValue(t) * 10 + (isRoyal(t) ? 50 : 0) - cost;
      if (!best || score > best.score) best = { target: ti, ids: cards.map((c) => c.id), score };
    }
  });
  return best ? { target: (best as { target: number }).target, ids: (best as { ids: CardId[] }).ids } : null;
}

function hint(s: CaptureState): Hint | null {
  const cap = bestCapture(s);
  if (cap) return { cards: [...cap.ids, s.dungeon[cap.target]!.id] };
  const low = s.hand.find(canBanish);
  const junk = s.dungeon.findIndex((d) => d && !isRoyal(d));
  if (low && junk >= 0 && !s.acted)
    return { cards: [low.id, s.dungeon[junk]!.id], message: 'Nothing to capture — banish a weak enemy.' };
  return { message: 'End your turn.' };
}

export const cardCaptureRules: GameRules<CaptureState, CaptureAction> = {
  setup,
  reduce,
  hint,
  status: (s) => (royalsLeft(s) === 0 ? 'won' : s.torches <= 0 ? 'lost' : 'playing'),
  score: (s) => s.royals,
  summary: (s) =>
    royalsLeft(s) === 0
      ? `All twelve royals captured with ${s.torches} torches to spare.`
      : `The torches went out with ${royalsLeft(s)} royals still free.`,
};
