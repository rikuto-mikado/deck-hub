import { isAlternatingRun } from '@/core/rules/cards';
import type { StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { bestTarget, canMove, canRecycle, type KlondikeAction, type KlondikeState, type PileId } from './logic';

export default function KlondikeBoard({ state, dispatch }: BoardProps<KlondikeState, KlondikeAction>) {
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
      <div style={columnsStyle(7, 118, 2.9)} className="grid grid-cols-7 justify-items-center gap-x-[var(--gap)] gap-y-4">
        <Pile
          cards={state.stock}
          label="Stock"
          onPileClick={() => dispatch({ type: 'draw' })}
          emptyLabel={canRecycle(state) ? '↻' : state.waste.length ? '✕' : ''}
        />
        <Pile
          id="waste"
          cards={state.waste}
          label="Waste"
          layout={state.draw === 3 ? 'fan-right' : 'stack'}
          maxFan={3}
          onCardClick={(_, i) => tap('waste', i)}
          isCardInteractive={(_, i) => i === state.waste.length - 1}
          canDrag={(_, i) => i === state.waste.length - 1}
        />
        <div />
        {state.foundations.map((f, i) => (
          <Pile
            key={i}
            id={`f${i}`}
            cards={f}
            label={`Foundation ${i + 1}`}
            emptyLabel="A"
            onCardClick={(_, idx) => tap(`f${i}`, idx)}
            isCardInteractive={(_, idx) => idx === f.length - 1}
            canDrag={(_, idx) => idx === f.length - 1}
          />
        ))}
        {state.tableau.map((t, i) => {
          const movable = (idx: number) => isAlternatingRun(t.slice(idx) as StandardCard[]);
          return (
            <Pile
              key={i}
              id={`t${i}`}
              cards={t}
              layout="fan-down"
              spread={t.length > 13 ? 0.7 : 1}
              label={`Column ${i + 1}`}
              emptyLabel="K"
              onCardClick={(_, idx) => tap(`t${i}`, idx)}
              isCardInteractive={(c) => c.faceUp}
              canDrag={(c, idx) => c.faceUp && movable(idx)}
            />
          );
        })}
      </div>
    </DragProvider>
  );
}
