import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { N, bestTarget, canMove, isFree, isUpright, type CrazyQuiltAction, type CrazyQuiltState } from './logic';

export default function CrazyQuiltBoard({ state, dispatch }: BoardProps<CrazyQuiltState, CrazyQuiltAction>) {
  const tap = (from: string) => {
    const to = bestTarget(state, from);
    if (to) dispatch({ type: 'move', from, to });
  };
  const onDrop = (from: { pileId: string }, to: string) => {
    if (!canMove(state, from.pileId, to)) return false;
    dispatch({ type: 'move', from: from.pileId, to });
    return true;
  };
  return (
    <DragProvider onDrop={onDrop}>
      <div className="flex items-center justify-center gap-4 [--card-w:clamp(20px,min(calc((min(100vw,1280px)-260px)/12.5),max(calc((100dvh-200px)/10),var(--card-floor))),62px)]">
        <div className="grid grid-cols-2 gap-[3px]">
          {state.foundations.map((f, i) => (
            <Pile key={i} id={`f${i}`} cards={f} label={`${i < 4 ? 'Up' : 'Down'} foundation ${(i % 4) + 1}`} />
          ))}
        </div>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${N}, calc(var(--card-w) * 1.18))`, gridAutoRows: 'calc(var(--card-w) * 1.18)' }}
          role="group"
          aria-label="Quilt"
        >
          {state.quilt.map((c, i) => (
            <div key={i} className="relative grid place-items-center">
              {c && (
                <div data-pile-id={`q${i}`} style={{ transform: isUpright(i) ? undefined : 'rotate(90deg)' }}>
                  <Card
                    card={c}
                    style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}
                    dimmed={!isFree(state, i)}
                    onClick={isFree(state, i) ? () => tap(`q${i}`) : undefined}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Pile
            cards={state.stock}
            label="Stock"
            onPileClick={() => dispatch({ type: 'draw' })}
            emptyLabel={state.redeals ? '↻' : '✕'}
          />
          <Pile
            id="waste"
            cards={state.waste}
            label="Waste"
            onCardClick={() => tap('waste')}
            isCardInteractive={(_, i) => i === state.waste.length - 1}
            canDrag={(_, i) => i === state.waste.length - 1}
          />
          <span className="text-[11px] text-cream/60">Redeals {state.redeals}</span>
        </div>
      </div>
    </DragProvider>
  );
}
