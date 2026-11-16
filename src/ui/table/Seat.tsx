import type { ReactNode } from 'react';
import type { Card as CardModel } from '@/core/types/card';
import { Pile } from '../pile/Pile';

export interface SeatProps {
  name: string;
  cards: readonly CardModel[];
  active?: boolean | undefined;
  /** Small line under the name, e.g. "Passed" or "1st". */
  note?: ReactNode | undefined;
  onCardClick?: ((card: CardModel, index: number) => void) | undefined;
  id?: string | undefined;
}

/** An opponent's place at the table: name, status and a compact fan of their (usually hidden) hand. */
export function Seat({ name, cards, active, note, onCardClick, id }: SeatProps) {
  const spread = cards.length > 1 ? Math.min(0.9, 3.2 / (cards.length - 1) / 0.28) : 1;
  return (
    <div
      className={`${onCardClick ? 'seat-cards-pick' : 'seat-cards'} flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition short:gap-0.5 short:py-1 ${
        active ? 'bg-gold/15 ring-1 ring-gold/60' : ''
      }`}
    >
      <div className="flex items-baseline gap-1.5 text-xs">
        <span className="font-semibold text-cream">{name}</span>
        <span className="text-cream/60 tabular-nums">{cards.length}</span>
      </div>
      <Pile
        id={id}
        cards={cards}
        layout="fan-right"
        spread={onCardClick ? Math.min(1.8, spread * 1.6) : spread}
        label={`${name}'s hand`}
        onCardClick={onCardClick}
        emptyLabel=""
      />
      <div className="h-4 text-[11px] text-gold/90">{note}</div>
    </div>
  );
}
