import type { ReactNode } from 'react';
import type { Card as CardModel } from '@/core/types/card';
import { Pile } from '../pile/Pile';

/** The running commentary line under a table (announced to screen readers). */
export function Log({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`min-h-5 text-center text-sm text-cream/85 ${className}`} aria-live="polite">
      {children}
    </p>
  );
}

/** A small pill: trump suit, phase, bid… */
export function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'red' | 'dim' }) {
  const look = tone === 'red' ? 'bg-[#c8102e] text-white' : tone === 'dim' ? 'bg-black/35 text-cream/80' : 'bg-gold text-ink';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider whitespace-nowrap ${look}`}>
      {children}
    </span>
  );
}

/** A labelled number for the table's scoreboard. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs text-cream/70">
      {label} <span className="text-sm font-semibold text-cream tabular-nums">{value}</span>
    </span>
  );
}

/** One card (or an empty slot) with an optional caption below it. */
export function Slot({
  card,
  caption,
  label,
  onClick,
  highlighted,
  selected,
  emptyLabel = '',
  id,
}: {
  card?: CardModel | null | undefined;
  caption?: ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
  highlighted?: boolean | undefined;
  selected?: boolean | undefined;
  emptyLabel?: ReactNode;
  id?: string | undefined;
}) {
  const ids = card ? new Set([card.id]) : undefined;
  return (
    <div className="flex flex-col items-center gap-1">
      <Pile
        id={id}
        cards={card ? [card] : []}
        label={label}
        emptyLabel={emptyLabel}
        onCardClick={onClick ? () => onClick() : undefined}
        onPileClick={onClick && !card ? onClick : undefined}
        highlightedIds={highlighted ? ids : undefined}
        selectedIds={selected ? ids : undefined}
        slotHighlighted={highlighted && !card}
      />
      {caption !== undefined && <span className="text-[11px] text-cream/70 tabular-nums">{caption}</span>}
    </div>
  );
}

/** The human's area at the bottom of a CPU table: a prompt line, buttons, then the hand. */
export function HandArea({
  active,
  prompt,
  actions,
  children,
  className = '',
}: {
  active: boolean;
  prompt: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`hand-cards area-main flex flex-col items-center gap-2 rounded-xl py-2 ${active ? 'bg-gold/10 ring-1 ring-gold/50' : ''} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream/75">
        <span>{prompt}</span>
        {actions}
      </div>
      {children}
    </div>
  );
}
