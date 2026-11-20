import { rankLabel, type Rank } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, isRun, type CanfieldAction, type CanfieldState, type PileId } from './logic';

/** Only the top card of a pile can be played. */
const top = (n: number) => (_: unknown, i: number) => i === n - 1;

export default function CanfieldBoard({ state, dispatch }: BoardProps<CanfieldState, CanfieldAction>) {
  const tap = (from: PileId, index: number) => {
    const to = bestTarget(state, from, index);
    if (to) dispatch({ type: 'move', from, index, to });
  };
  const onDrop = (from: { pileId: string; index: number }, to: string) => {
    if (!canMove(state, from.pileId, from.index, to)) return false;
    dispatch({ type: 'move', from: from.pileId, index: from.index, to });
    return true;
  };
  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(7, 112, 3.4)} className="grid grid-cols-7 justify-items-center gap-x-[var(--gap)] gap-y-4">
        <Pile
          cards={state.stock}
          label="Stock"
          onPileClick={() => dispatch({ type: 'draw' })}
          emptyLabel={state.waste.length ? '↻' : ''}
        />
        <Pile
          id="waste"
          cards={state.waste}
          layout={state.draw === 3 ? 'fan-right' : 'stack'}
          maxFan={3}
          label="Waste"
          onCardClick={(_, i) => tap('waste', i)}
          isCardInteractive={top(state.waste.length)}
          canDrag={top(state.waste.length)}
        />
        <div />
        {state.foundations.map((f, i) => (
          <Pile key={i} id={`f${i}`} cards={f} label={`Foundation ${i + 1}`} emptyLabel={rankLabel(state.base as Rank)} />
        ))}
        <div className="flex flex-col items-center gap-1">
          <Pile
            id="reserve"
            cards={state.reserve}
            layout="fan-down"
            spread={0.12}
            label={`Reserve, ${state.reserve.length} left`}
            onCardClick={(_, i) => tap('reserve', i)}
            isCardInteractive={top(state.reserve.length)}
            canDrag={top(state.reserve.length)}
            emptyLabel=""
          />
          <span className="text-[11px] text-cream/60">Reserve {state.reserve.length}</span>
        </div>
        <div />
        {state.tableau.map((t, i) => (
          <Pile
            key={i}
            id={`t${i}`}
            cards={t}
            layout="fan-down"
            spread={t.length > 10 ? 0.7 : 1}
            label={`Column ${i + 1}`}
            onCardClick={(_, idx) => tap(`t${i}`, idx)}
            isCardInteractive={(_, idx) => idx === t.length - 1 || (idx === 0 && isRun(t))}
            canDrag={(_, idx) => idx === t.length - 1 || (idx === 0 && isRun(t))}
          />
        ))}
      </div>
    </DragProvider>
  );
}
