import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, type PileId, type YukonAction, type YukonState } from './logic';

export default function YukonBoard({ state, dispatch }: BoardProps<YukonState, YukonAction>) {
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
      <div style={columnsStyle(8, 112, 4.4)} className="grid grid-cols-8 justify-items-center gap-x-[var(--gap)]">
        {state.tableau.map((t, i) => (
          <Pile
            key={i}
            id={`t${i}`}
            cards={t}
            layout="fan-down"
            spread={t.length > 14 ? 0.55 : t.length > 10 ? 0.7 : 0.9}
            label={`Column ${i + 1}`}
            emptyLabel="K"
            onCardClick={(_, idx) => tap(`t${i}`, idx)}
            isCardInteractive={(c) => c.faceUp}
            canDrag={(c) => c.faceUp}
          />
        ))}
        <div className="flex flex-col gap-[var(--gap)]">
          {state.foundations.map((f, i) => (
            <Pile key={i} id={`f${i}`} cards={f} label={`Foundation ${i + 1}`} emptyLabel="A" />
          ))}
        </div>
      </div>
    </DragProvider>
  );
}
