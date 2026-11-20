import { isAlternatingRun } from '@/core/rules/cards';
import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, type FreeCellAction, type FreeCellState, type PileId } from './logic';

export default function FreeCellBoard({ state, dispatch }: BoardProps<FreeCellState, FreeCellAction>) {
  const tap = (from: PileId, index: number) => {
    const to = bestTarget(state, from, index);
    if (to) dispatch({ type: 'move', from, index, to });
  };
  const onDrop = (from: { pileId: string; index: number }, to: string) => {
    if (!canMove(state, from.pileId, from.index, to)) return false;
    dispatch({ type: 'move', from: from.pileId, index: from.index, to });
    return true;
  };

  const double = state.tableau.length > 8;
  const cols = state.tableau.length;

  return (
    <DragProvider onDrop={onDrop}>
      <div
        style={{ ...columnsStyle(cols, 118, double ? 4.6 : 3.3), gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        className="grid justify-items-center gap-x-[var(--gap)] gap-y-4 short:gap-y-2"
      >
        {state.cells.map((c, i) => (
          <Pile
            key={`c${i}`}
            id={`c${i}`}
            cards={c ? [c] : []}
            label={`Free cell ${i + 1}`}
            onCardClick={() => tap(`c${i}`, 0)}
            canDrag={() => true}
          />
        ))}
        {state.foundations.map((f, i) => (
          <Pile key={`f${i}`} id={`f${i}`} cards={f} label={`Foundation ${i + 1}`} emptyLabel="A" />
        ))}
        {/* Double FreeCell: 16 cells and foundations over a 10-wide grid; pad the second row. */}
        {double && Array.from({ length: 2 * cols - 16 }, (_, i) => <div key={`pad${i}`} />)}
        {state.tableau.map((t, i) => (
          <Pile
            key={`t${i}`}
            id={`t${i}`}
            cards={t}
            layout="fan-down"
            spread={t.length > 16 ? 0.6 : t.length > 12 ? 0.75 : 1}
            label={`Column ${i + 1}`}
            onCardClick={(_, idx) => tap(`t${i}`, idx)}
            isCardInteractive={(_, idx) => isAlternatingRun(t.slice(idx))}
            canDrag={(_, idx) => isAlternatingRun(t.slice(idx))}
          />
        ))}
      </div>
    </DragProvider>
  );
}
