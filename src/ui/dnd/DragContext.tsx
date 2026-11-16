import { animate, useMotionValue, type MotionValue } from 'motion/react';
import { landing } from './landing';
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface DragSource {
  pileId: string;
  index: number;
}

/** Returns true when the drop was accepted (the game state moved the cards). */
export type DropHandler = (from: DragSource, toPileId: string) => boolean;

interface DragCtx {
  active: DragSource | null;
  hoverPileId: string | null;
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** Pointer-down on a draggable card. Returns a click guard: true if the press became a drag. */
  press: (source: DragSource, e: React.PointerEvent) => void;
  wasDrag: () => boolean;
}

const Ctx = createContext<DragCtx | null>(null);
const THRESHOLD = 6;

function pileAt(x: number, y: number, exclude: string): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const id = (el as HTMLElement).closest<HTMLElement>('[data-pile-id]')?.dataset.pileId;
    if (id && id !== exclude) return id;
  }
  return null;
}

/**
 * Pointer-based drag for card piles (mouse + touch). Lighter than a DnD library and
 * cooperates with Motion layout animations: dragged cards are offset with motion values,
 * and when the game accepts the drop the cards fly from where they were released.
 */
export function DragProvider({ onDrop, children }: { onDrop: DropHandler; children: ReactNode }) {
  const [active, setActive] = useState<DragSource | null>(null);
  const [hoverPileId, setHover] = useState<string | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragged = useRef(false);
  const onDropRef = useRef(onDrop);
  useLayoutEffect(() => {
    onDropRef.current = onDrop;
  });

  const press = useCallback(
    (source: DragSource, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragged.current = false;
      const sx = e.clientX,
        sy = e.clientY;
      let started = false;

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx,
          dy = ev.clientY - sy;
        if (!started) {
          if (Math.hypot(dx, dy) < THRESHOLD) return;
          started = true;
          dragged.current = true;
          setActive(source);
        }
        x.set(dx);
        y.set(dy);
        setHover(pileAt(ev.clientX, ev.clientY, source.pileId));
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!started) return;
        const target = ev.type === 'pointerup' ? pileAt(ev.clientX, ev.clientY, source.pileId) : null;
        const lifted = [...document.querySelectorAll<HTMLElement>(`[data-pile-id="${source.pileId}"] [data-card-id]`)].slice(
          source.index,
        );
        for (const el of lifted) {
          const r = el.getBoundingClientRect();
          landing.set(el.dataset.cardId!, { left: r.left, top: r.top });
        }
        const ok = target ? onDropRef.current(source, target) : false;
        if (!ok) for (const el of lifted) landing.delete(el.dataset.cardId!);
        setActive(null);
        setHover(null);
        if (ok) {
          // Cards re-layout in their new pile; Motion animates them from the release point.
          x.jump(0);
          y.jump(0);
        } else {
          animate(x, 0, { type: 'spring', stiffness: 600, damping: 40 });
          animate(y, 0, { type: 'spring', stiffness: 600, damping: 40 });
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [x, y],
  );

  const wasDrag = useCallback(() => {
    const d = dragged.current;
    dragged.current = false;
    return d;
  }, []);

  const value = useMemo(() => ({ active, hoverPileId, x, y, press, wasDrag }), [active, hoverPileId, x, y, press, wasDrag]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrag(): DragCtx | null {
  return useContext(Ctx);
}
