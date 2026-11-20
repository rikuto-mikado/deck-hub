import { isSuitedRun } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, type FortyThievesAction, type FortyThievesState, type PileId } from './logic';

export default function FortyThievesBoard({ state, dispatch }: BoardProps<FortyThievesState, FortyThievesAction>) {
  const tap = (from: PileId, index: number) => {
    const to = bestTarget(state, from, index);
    if (to) dispatch({ type: 'move', from, index, to });
  };
  const onDrop = (from: { pileId: string; index: number }, to: string) => {
    if (!canMove(state, from.pileId, from.index, to)) return false;
    dispatch({ type: 'move', from: from.pileId, index: from.index, to });
    return true;
  };
  const movable = (t: readonly StandardCard[], idx: number) =>
    idx === t.length - 1 || (state.josephine && isSuitedRun(t.slice(idx)));
  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(10, 104, 4.1)} className="flex flex-col gap-3 short:gap-2">
        <div className="grid grid-cols-10 justify-items-center gap-x-[var(--gap)]">
          {state.foundations.map((f, i) => (
            <Pile key={i} id={`f${i}`} cards={f} label={`Foundation ${i + 1}`} emptyLabel="A" />
          ))}
          <Pile
            cards={state.stock}
            label={`Stock, ${state.stock.length} left`}
            onPileClick={() => dispatch({ type: 'draw' })}
            emptyLabel="✕"
          />
          <Pile
            id="waste"
            cards={state.waste}
            label="Waste"
            onCardClick={(_, i) => tap('waste', i)}
            isCardInteractive={(_, i) => i === state.waste.length - 1}
            canDrag={(_, i) => i === state.waste.length - 1}
          />
        </div>
        <div className="grid grid-cols-10 justify-items-center gap-x-[var(--gap)]">
          {state.tableau.map((t, i) => (
            <Pile
              key={i}
              id={`t${i}`}
              cards={t}
              layout="fan-down"
              spread={t.length > 10 ? 0.6 : 0.85}
              label={`Column ${i + 1}`}
              onCardClick={(_, idx) => tap(`t${i}`, idx)}
              isCardInteractive={(_, idx) => movable(t, idx)}
              canDrag={(_, idx) => movable(t, idx)}
            />
          ))}
        </div>
      </div>
    </DragProvider>
  );
}
