import type { Card } from './card';

export type PileKind = 'stock' | 'waste' | 'tableau' | 'foundation' | 'cell' | 'hand' | 'discard';

export interface Pile {
  readonly id: string;
  readonly kind: PileKind;
  readonly cards: readonly Card[];
}

export function topCard(pile: Pile): Card | undefined {
  return pile.cards[pile.cards.length - 1];
}
