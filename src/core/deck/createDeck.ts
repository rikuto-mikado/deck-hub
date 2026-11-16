import {
  RANKS,
  SUITS,
  SUIT_LETTER,
  type Card,
  type CardId,
  type JokerCard,
  type Rank,
  type StandardCard,
  type Suit,
} from '../types/card';

export interface DeckOptions {
  /** Number of 52-card decks to combine (Spider uses 2). */
  decks?: number;
  /** Jokers per deck. */
  jokers?: number;
  /** Restrict suits (e.g. one-suit Spider). Repeats fill up to 4 suits' worth of cards. */
  suits?: readonly Suit[];
  faceUp?: boolean;
}

export function makeCardId(suit: Suit, rank: Rank, copy = 0): CardId {
  return `${SUIT_LETTER[suit]}${rank}-${copy}` as CardId;
}

export function makeCard(suit: Suit, rank: Rank, copy = 0, faceUp = false): StandardCard {
  return { kind: 'standard', id: makeCardId(suit, rank, copy), suit, rank, faceUp };
}

/**
 * Builds an ordered deck. IDs are deterministic ("S13-0") and unique within the deck,
 * so they are stable React keys and survive JSON save/load.
 */
export function createDeck(options: DeckOptions = {}): Card[] {
  const { decks = 1, jokers = 0, suits = SUITS, faceUp = false } = options;
  if (suits.length === 0) throw new Error('createDeck: suits must not be empty');

  const cards: Card[] = [];
  const copies = new Map<Suit, number>();
  // Each deck contributes 4 suit-runs; with fewer suits we cycle through them.
  const runsPerDeck = 4;
  for (let d = 0; d < decks; d++) {
    for (let r = 0; r < runsPerDeck; r++) {
      const suit = suits[(d * runsPerDeck + r) % suits.length] as Suit;
      const copy = copies.get(suit) ?? 0;
      copies.set(suit, copy + 1);
      for (const rank of RANKS) cards.push(makeCard(suit, rank, copy, faceUp));
    }
    for (let j = 0; j < jokers; j++) {
      const joker: JokerCard = {
        kind: 'joker',
        id: `JK-${d * jokers + j}` as CardId,
        faceUp,
      };
      cards.push(joker);
    }
  }
  return cards;
}

export function flip<C extends Card>(card: C, faceUp = !card.faceUp): C {
  return card.faceUp === faceUp ? card : { ...card, faceUp };
}

/** Same as createDeck without jokers, typed as StandardCard[] so games skip joker checks. */
export function createStandardDeck(options: Omit<DeckOptions, 'jokers'> = {}): StandardCard[] {
  return createDeck({ ...options, jokers: 0 }) as StandardCard[];
}
