import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { DragProvider, useDrag } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { bestTarget, canMove, type CastleAction, type CastleState } from './logic';

/** A wing of the castle: cards fan outwards from the keep; the outermost card is free. */
function Wing({ state, row, side, onTap }: { state: CastleState; row: number; side: 'left' | 'right'; onTap: () => void }) {
  const cards = state.rows[row]!;
  const drag = useDrag();
  const step = 0.36;
  const width = `calc(var(--card-w) * ${1 + Math.max(0, cards.length - 1) * step})`;
  const dragging = drag?.active?.pileId === `r${row}`;
  return (
    <div
      className="relative shrink-0"
      style={{ width: `max(${width}, calc(var(--card-w) * ${1 + 7 * step}))`, height: 'var(--card-h)' }}
      data-pile-id={`r${row}`}
      role="group"
      aria-label={`${side === 'left' ? 'Left' : 'Right'} wing ${(row % 4) + 1}`}
    >
      <div
        className="pile-slot absolute top-0 h-[var(--card-h)] w-[var(--card-w)]"
        style={{ [side === 'left' ? 'right' : 'left']: 0 }}
      />
      {cards.map((c, i) => {
        const free = i === cards.length - 1;
        const offset = `calc(var(--card-w) * ${(cards.length - 1 - i) * step})`;
        const lifted = dragging && free;
        return (
          <Card
            key={c.id}
            card={c}
            style={{
              position: 'absolute',
              top: 0,
              width: 'var(--card-w)',
              height: 'var(--card-h)',
              zIndex: lifted ? 1000 : i + 1,
              [side === 'left' ? 'right' : 'left']: offset,
              ...(free ? { touchAction: 'none' } : {}),
            }}
            lifted={lifted}
            dragOffset={lifted && drag ? drag : undefined}
            onClick={free ? () => !drag?.wasDrag() && onTap() : undefined}
            onPointerDown={free && drag ? (e) => drag.press({ pileId: `r${row}`, index: i }, e) : undefined}
            highlighted={drag?.hoverPileId === `r${row}` && free}
          />
        );
      })}
    </div>
  );
}

export default function CastleBoard({ state, dispatch }: BoardProps<CastleState, CastleAction>) {
  const tap = (from: number) => {
    const to = bestTarget(state, from);
    if (to) dispatch({ type: 'move', from, to });
  };
  const onDrop = (from: { pileId: string }, to: string) => {
    const f = Number(from.pileId.slice(1));
    if (!canMove(state, f, to)) return false;
    dispatch({ type: 'move', from: f, to });
    return true;
  };
  return (
    <DragProvider onDrop={onDrop}>
      <div className="flex justify-center gap-[var(--gap)] [--card-w:clamp(26px,min(calc((min(100vw,1280px)-120px)/13),calc((100dvh-200px)/6.2)),80px)]">
        <div className="flex flex-col gap-[calc(var(--card-w)*0.1)]">
          {[0, 1, 2, 3].map((r) => (
            <Wing key={r} state={state} row={r} side="left" onTap={() => tap(r)} />
          ))}
        </div>
        <div className="flex flex-col gap-[calc(var(--card-w)*0.1)]">
          {state.foundations.map((f, i) => (
            <Pile key={i} id={`f${i}`} cards={f} label={`Foundation ${i + 1}`} />
          ))}
        </div>
        <div className="flex flex-col gap-[calc(var(--card-w)*0.1)]">
          {[4, 5, 6, 7].map((r) => (
            <Wing key={r} state={state} row={r} side="right" onTap={() => tap(r)} />
          ))}
        </div>
      </div>
    </DragProvider>
  );
}
