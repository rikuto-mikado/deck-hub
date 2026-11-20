import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export interface ElevensState {
  grid: (StandardCard | null)[];
  stock: StandardCard[];
  removed: StandardCard[];
  selected: CardId[];
}

export type ElevensAction = { type: 'select'; cell: number };

export function setup(rng: Rng): ElevensState {
  const deck = shuffle(createStandardDeck(), rng);
  return { grid: deck.slice(0, 9).map((c) => ({ ...c, faceUp: true })), stock: deck.slice(9), removed: [], selected: [] };
}

/** Two number cards summing to 11 (Ace = 1), or one each of J, Q and K. */
export function isSet(cards: readonly StandardCard[]): boolean {
  if (cards.length === 2) return cards.every((c) => c.rank <= 10) && cards[0]!.rank + cards[1]!.rank === 11;
  if (cards.length === 3) return [11, 12, 13].every((r) => cards.some((c) => c.rank === r));
  return false;
}

/** Could these cards still grow into a set? */
const partial = (cards: readonly StandardCard[]) =>
  cards.length < 2 ||
  (cards.length === 2 && cards.every((c) => c.rank > 10) && cards[0]!.rank !== cards[1]!.rank) ||
  isSet(cards);

function reduce(s: ElevensState, a: ElevensAction): ElevensState {
  const card = s.grid[a.cell];
  if (!card) return s;
  const selected = s.selected.includes(card.id) ? s.selected.filter((id) => id !== card.id) : [...s.selected, card.id];
  const cards = selected.map((id) => s.grid.find((c) => c?.id === id)!);
  if (!isSet(cards)) return { ...s, selected: partial(cards) ? selected : [card.id] };
  // Deal replacements onto the cleared spaces.
  const stock = s.stock.slice();
  const grid = s.grid.map((c) => {
    if (!c || !selected.includes(c.id)) return c;
    const next = stock.pop();
    return next ? { ...next, faceUp: true } : null;
  });
  return { grid, stock, removed: [...s.removed, ...cards], selected: [] };
}

export function findSet(s: ElevensState): StandardCard[] | null {
  const cards = s.grid.filter((c): c is StandardCard => !!c);
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      if (isSet([cards[i]!, cards[j]!])) return [cards[i]!, cards[j]!];
      for (let k = j + 1; k < cards.length; k++)
        if (isSet([cards[i]!, cards[j]!, cards[k]!])) return [cards[i]!, cards[j]!, cards[k]!];
    }
  return null;
}

export const elevensRules: GameRules<ElevensState, ElevensAction> = {
  setup,
  reduce,
  hint: (s): Hint | null => {
    const set = findSet(s);
    return set ? { cards: set.map((c) => c.id) } : null;
  },
  status: (s) => (s.removed.length === 52 ? 'won' : findSet(s) ? 'playing' : 'lost'),
  score: (s) => s.removed.length,
  summary: (s) =>
    s.removed.length === 52 ? 'The whole deck is cleared!' : `${52 - s.removed.length} cards left with no eleven to make.`,
};
