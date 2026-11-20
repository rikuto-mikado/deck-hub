import type { StandardCard, Suit } from '../types/card';

/** A card in a trick, tagged with the seat that played it. */
export interface TrickPlay<C extends StandardCard = StandardCard> {
  by: number;
  card: C;
}

export interface LegalOptions {
  /** Suit that counts for following (e.g. Euchre's Left Bower belongs to trump). */
  suitOf?: (card: StandardCard) => Suit;
  /** Hearts / Spades: this suit may not be led until it has been broken (unless nothing else is left). */
  unbrokenSuit?: Suit | null;
  /** Hearts' first trick: these cards may not be played while anything else would do. */
  forbidden?: (card: StandardCard) => boolean;
}

/**
 * Cards a player may play: follow the led suit when able; otherwise anything. On a lead, an
 * unbroken suit is held back unless the hand has nothing else.
 */
export function legalMoves<C extends StandardCard>(hand: readonly C[], leadSuit: Suit | null, options: LegalOptions = {}): C[] {
  const suitOf = options.suitOf ?? ((c: StandardCard) => c.suit);
  let legal: C[];
  if (leadSuit === null) {
    const restricted = options.unbrokenSuit;
    legal = restricted ? hand.filter((c) => suitOf(c) !== restricted) : hand.slice();
    if (!legal.length) legal = hand.slice();
  } else {
    const follow = hand.filter((c) => suitOf(c) === leadSuit);
    legal = follow.length ? follow : hand.slice();
  }
  if (options.forbidden) {
    const clean = legal.filter((c) => !options.forbidden!(c));
    if (clean.length) legal = clean;
  }
  return legal;
}

/** Ace-high rank: 2…14. */
export const aceHigh = (c: StandardCard) => (c.rank === 1 ? 14 : c.rank);

/**
 * Which play wins the trick: the highest trump if any was played, else the highest card of the
 * led suit. `power` overrides card strength (e.g. Euchre bowers, Napoleon's Mighty).
 */
export function trickWinner<C extends StandardCard>(
  trick: readonly TrickPlay<C>[],
  trump: Suit | null,
  options: { suitOf?: (card: StandardCard) => Suit; power?: (card: StandardCard) => number } = {},
): TrickPlay<C> {
  const suitOf = options.suitOf ?? ((c: StandardCard) => c.suit);
  const power = options.power ?? aceHigh;
  const lead = suitOf(trick[0]!.card);
  const score = (p: TrickPlay<C>) => {
    const s = suitOf(p.card);
    if (trump && s === trump) return 200 + power(p.card);
    if (s === lead) return 100 + power(p.card);
    return 0;
  };
  return trick.reduce((best, p) => (score(p) > score(best) ? p : best));
}

/** Sorts a hand by suit (♠ ♥ ♣ ♦ alternating colours) then rank, Ace high. */
export function sortTrickHand<C extends StandardCard>(hand: readonly C[], suitOrder: readonly Suit[] = SUIT_ORDER): C[] {
  return hand.toSorted((a, b) => suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit) || aceHigh(a) - aceHigh(b));
}

export const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
