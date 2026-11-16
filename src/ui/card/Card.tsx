import { animate, motion, useMotionValue, type MotionStyle, type MotionValue } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { landing } from '../dnd/landing';
import type { KeyboardEvent, MouseEvent } from 'react';
import { cardLabel, type Card as CardModel } from '@/core/types/card';
import { CardBack } from './CardBack';
import { CardFace } from './CardFace';
import { nextDealSlot, useTableInfo } from './TableContext';

export interface CardProps {
  card: CardModel;
  onClick?: ((card: CardModel, event: MouseEvent | KeyboardEvent) => void) | undefined;
  selected?: boolean | undefined;
  /** Visual hint (e.g. a legal target). */
  highlighted?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Drawn darker, e.g. a covered Pyramid card that can't be taken yet. */
  dimmed?: boolean | undefined;
  className?: string | undefined;
  style?: MotionStyle | undefined;
  /** Being dragged: drop the layout animation so it tracks the pointer. */
  lifted?: boolean | undefined;
  onPointerDown?: ((e: React.PointerEvent) => void) | undefined;
  /** Pointer offset while this card is being dragged. */
  dragOffset?: { x: MotionValue<number>; y: MotionValue<number> } | undefined;
}

const MOVE = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 } as const;
const FLIP = { duration: 0.38, ease: [0.4, 0, 0.2, 1] } as const;

/**
 * A single playing card. `layoutId` is the card's ID, so when game logic moves a card
 * to another pile, Motion animates it flying there — games never animate cards by hand.
 */
export function Card({
  card,
  onClick,
  selected,
  highlighted,
  disabled,
  dimmed,
  className = '',
  style,
  lifted,
  onPointerDown,
  dragOffset,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const table = useTableInfo();
  const hinted = table.hinted.has(card.id);
  // Dealing: each card fades and scales in, staggered by the order it appeared in this deal.
  const [dealDelay, setDealDelay] = useState<number | null>(() =>
    table.dealing ? Math.min(nextDealSlot(table.dealId) * 0.022, 1.1) : null,
  );
  const lx = useMotionValue(0);
  const ly = useMotionValue(0);
  // A card that was just dropped skips the shared-layout flight and animates from the release point.
  const [landedFrom, setLandedFrom] = useState(() => landing.get(card.id));
  useLayoutEffect(() => {
    if (!landedFrom || !ref.current) return;
    landing.delete(card.id);
    const r = ref.current.getBoundingClientRect();
    lx.set(landedFrom.left - r.left);
    ly.set(landedFrom.top - r.top);
    const spring = { type: 'spring', stiffness: 520, damping: 40 } as const;
    animate(lx, 0, spring);
    // Rejoin shared-layout animations once settled.
    void animate(ly, 0, spring).then(() => setLandedFrom(undefined));
  }, [landedFrom, card.id, lx, ly]);

  const interactive = !!onClick && !disabled;
  const label = card.faceUp ? cardLabel(card) : 'Face-down card';

  return (
    <motion.div
      ref={ref}
      data-card-id={card.id}
      {...(landedFrom ? {} : { layoutId: card.id, layout: 'position' as const })}
      transition={{ layout: MOVE, default: { type: 'spring', stiffness: 420, damping: 28, delay: dealDelay ?? 0 } }}
      initial={dealDelay !== null ? { opacity: 0, scale: 0.6, rotate: -6 } : false}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      onAnimationComplete={() => dealDelay !== null && setDealDelay(null)}
      className={[
        'card relative rounded-[calc(var(--card-w)*0.075)] select-none',
        interactive ? 'cursor-pointer' : '',
        selected ? 'card-selected' : '',
        lifted ? 'card-lifted' : '',
        highlighted ? 'card-highlighted' : '',
        hinted ? 'card-hint' : '',
        dimmed ? 'card-dimmed' : '',
        className,
      ].join(' ')}
      style={{ perspective: 'calc(var(--card-w) * 8)', ...style, x: dragOffset?.x ?? lx, y: dragOffset?.y ?? ly }}
      aria-label={label}
      {...(onPointerDown ? { onPointerDown } : {})}
      {...(interactive
        ? {
            role: 'button',
            'aria-pressed': !!selected,
            tabIndex: 0,
            whileHover: lifted ? {} : { scale: 1.02 },
            whileTap: { scale: 0.97 },
            onClick: (e: MouseEvent) => onClick(card, e),
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(card, e);
              }
            },
          }
        : { role: 'img' })}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: card.faceUp ? 0 : 180 }}
        transition={FLIP}
      >
        <div className="absolute inset-0 backface-hidden">
          <CardFace card={card} />
        </div>
        <div className="absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}
