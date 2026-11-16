export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Rank = (typeof RANKS)[number];

export type Color = 'red' | 'black';

/** Branded string so arbitrary strings can't be passed where a card ID is expected. */
export type CardId = string & { readonly __brand: 'CardId' };

export interface StandardCard {
  readonly kind: 'standard';
  readonly id: CardId;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
}

export interface JokerCard {
  readonly kind: 'joker';
  readonly id: CardId;
  readonly faceUp: boolean;
}

export type Card = StandardCard | JokerCard;

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_LETTER: Record<Suit, string> = {
  spades: 'S',
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
};

export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

export function isStandard(card: Card): card is StandardCard {
  return card.kind === 'standard';
}

export function cardLabel(card: Card): string {
  return card.kind === 'joker' ? 'Joker' : `${SUIT_SYMBOL[card.suit]}${rankLabel(card.rank)}`;
}
