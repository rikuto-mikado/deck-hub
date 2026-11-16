import type { ReactNode } from 'react';
import type { Card as CardModel } from '@/core/types/card';
import { Card } from '../card/Card';
import { useDrag } from '../dnd/DragContext';

export type PileLayout = 'stack' | 'fan-down' | 'fan-right';

export interface PileProps {
  cards: readonly CardModel[];
  layout?: PileLayout | undefined;
  /** Identifies the pile as a drag source / drop target (requires a DragProvider). */
  id?: string | undefined;
  onCardClick?: ((card: CardModel, index: number) => void) | undefined;
  /** Clicking the pile itself (used for empty piles, e.g. recycling the stock). */
  onPileClick?: (() => void) | undefined;
  /** Only these cards are clickable; defaults to every card. */
  isCardInteractive?: ((card: CardModel, index: number) => boolean) | undefined;
  /** Cards that can start a drag; the card and everything above it move together. */
  canDrag?: ((card: CardModel, index: number) => boolean) | undefined;
  selectedIds?: ReadonlySet<string> | undefined;
  highlightedIds?: ReadonlySet<string> | undefined;
  /** Shown inside the empty slot (e.g. "A" for a foundation). */
  emptyLabel?: ReactNode | undefined;
  /** Highlights the slot (e.g. a legal target for the selected card). */
  slotHighlighted?: boolean | undefined;
  /** Max cards to fan; earlier cards collapse underneath (fan-right waste piles). */
  maxFan?: number | undefined;
  /** Fan spacing multiplier (e.g. 0.7 to squeeze tall columns). */
  spread?: number | undefined;
  label?: string | undefined;
  className?: string | undefined;
}

// Offsets as a fraction of card width.
const FAN_DOWN_UP = 0.3;
const FAN_DOWN_DOWN = 0.12;
const FAN_RIGHT = 0.28;

function offsets(cards: readonly CardModel[], layout: PileLayout, maxFan: number, spread: number) {
  const out: number[] = [];
  let acc = 0;
  const fanStart = Math.max(0, cards.length - maxFan);
  cards.forEach((card, i) => {
    out.push(acc);
    if (layout === 'fan-down') acc += (card.faceUp ? FAN_DOWN_UP : FAN_DOWN_DOWN) * spread;
    else if (layout === 'fan-right' && i >= fanStart) acc += FAN_RIGHT * spread;
  });
  return { out, extent: out[out.length - 1] ?? 0 };
}

/** A pile of cards laid out as a stack or a fan. Knows nothing about game rules. */
export function Pile({
  cards,
  layout = 'stack',
  id,
  onCardClick,
  onPileClick,
  isCardInteractive,
  canDrag,
  selectedIds,
  highlightedIds,
  emptyLabel,
  slotHighlighted,
  maxFan = Infinity,
  spread = 1,
  label,
  className = '',
}: PileProps) {
  const drag = useDrag();
  const { out, extent } = offsets(cards, layout, maxFan, spread);
  const size =
    layout === 'fan-down'
      ? { width: 'var(--card-w)', height: `calc(var(--card-h) + var(--card-w) * ${extent})` }
      : layout === 'fan-right'
        ? { width: `calc(var(--card-w) * ${1 + extent})`, height: 'var(--card-h)' }
        : { width: 'var(--card-w)', height: 'var(--card-h)' };

  const dragging = drag?.active && drag.active.pileId === id ? drag.active.index : -1;
  const isDropHover = !!id && drag?.hoverPileId === id;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={size}
      aria-label={label}
      data-pile-id={id}
      // A clickable pile (the stock) is a real button: focusable and usable from the keyboard.
      {...(onPileClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: onPileClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPileClick();
              }
            },
          }
        : { role: 'group' })}
    >
      <div
        className={`pile-slot absolute top-0 left-0 grid h-[var(--card-h)] w-[var(--card-w)] place-items-center ${
          slotHighlighted || isDropHover ? 'pile-slot-hot' : ''
        }`}
      >
        {emptyLabel}
      </div>
      {cards.map((card, i) => {
        const interactive = !!onCardClick && (isCardInteractive?.(card, i) ?? true);
        const draggable = !!drag && !!id && (canDrag?.(card, i) ?? false);
        const lifted = dragging >= 0 && i >= dragging;
        const pos = `calc(var(--card-w) * ${out[i] ?? 0})`;
        return (
          <Card
            key={card.id}
            card={card}
            style={{
              position: 'absolute',
              width: 'var(--card-w)',
              height: 'var(--card-h)',
              zIndex: lifted ? 1000 + i : i + 1,
              ...(layout === 'fan-right' ? { left: pos, top: 0 } : { top: pos, left: 0 }),
              // Buried cards in a stack stay mounted (so they can fly out) but invisible,
              // otherwise 52 stacked drop-shadows darken the pile edge.
              ...(layout === 'stack' && i < cards.length - 2 && !lifted ? { opacity: 0 } : {}),
              ...(draggable ? { touchAction: 'none' } : {}),
            }}
            lifted={lifted}
            dragOffset={lifted && drag ? drag : undefined}
            selected={selectedIds?.has(card.id) ?? false}
            highlighted={(highlightedIds?.has(card.id) ?? false) || (isDropHover && i === cards.length - 1)}
            {...(draggable ? { onPointerDown: (e: React.PointerEvent) => drag.press({ pileId: id, index: i }, e) } : {})}
            {...(interactive
              ? {
                  onClick: (c, e) => {
                    e.stopPropagation();
                    if (drag?.wasDrag()) return;
                    onCardClick(c, i);
                  },
                }
              : {})}
          />
        );
      })}
    </div>
  );
}
