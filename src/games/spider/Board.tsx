import { isSuitedRun } from '@/core/rules/cards';
import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, type SpiderAction, type SpiderState } from './logic';

export default function SpiderBoard({ state, dispatch }: BoardProps<SpiderState, SpiderAction>) {
  const tap = (from: number, index: number) => {
    const to = bestTarget(state, from, index);
    if (to !== null) dispatch({ type: 'move', from, index, to });
  };
  const onDrop = (from: { pileId: string; index: number }, to: string) => {
    const f = Number(from.pileId.slice(1)),
      t = Number(to.slice(1));
    if (!canMove(state, f, from.index, t)) return false;
    dispatch({ type: 'move', from: f, index: from.index, to: t });
    return true;
  };
  const dealsLeft = state.stock.length / 10;
  const canDeal = dealsLeft > 0 && state.tableau.every((t) => t.length);

  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(10, 104, 2.9)} className="flex flex-col gap-4">
        <div className="flex items-end gap-[var(--gap)]">
          <button
            type="button"
            className="relative disabled:opacity-40"
            style={{ width: 'calc(var(--card-w) + 4px * 4)', height: 'var(--card-h)' }}
            onClick={() => dispatch({ type: 'deal' })}
            disabled={!canDeal}
            aria-label={`Deal a row, ${dealsLeft} left`}
            title={dealsLeft && !canDeal ? 'Fill every column before dealing' : undefined}
          >
            {Array.from({ length: dealsLeft }, (_, i) => (
              <span key={i} className="absolute top-0 h-full w-[var(--card-w)]" style={{ left: i * 4 }}>
                <Pile cards={state.stock.slice(i * 10, i * 10 + 10)} />
              </span>
            ))}
            {!dealsLeft && <span className="pile-slot absolute inset-0 w-[var(--card-w)]" />}
          </button>
          <div className="ml-auto flex">
            {state.done.map((run, i) => (
              <div key={i} style={{ marginLeft: i ? 'calc(var(--card-w) * -0.7)' : 0 }}>
                <Pile cards={run.toReversed()} label="Completed run" />
              </div>
            ))}
            <span className="self-center pl-3 text-xs text-cream/60">{state.done.length}/8</span>
          </div>
        </div>
        <div className="grid grid-cols-10 justify-items-center gap-x-[var(--gap)]">
          {state.tableau.map((t, i) => (
            <Pile
              key={i}
              id={`t${i}`}
              cards={t}
              layout="fan-down"
              spread={t.length > 14 ? 0.65 : t.length > 10 ? 0.8 : 1}
              label={`Column ${i + 1}`}
              onCardClick={(_, idx) => tap(i, idx)}
              isCardInteractive={(c, idx) => c.faceUp && isSuitedRun(t.slice(idx))}
              canDrag={(c, idx) => c.faceUp && isSuitedRun(t.slice(idx))}
            />
          ))}
        </div>
      </div>
    </DragProvider>
  );
}
