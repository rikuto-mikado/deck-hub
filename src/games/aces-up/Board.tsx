import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { canDiscard, canMove, type AcesUpAction, type AcesUpState } from './logic';

export default function AcesUpBoard({ state, dispatch }: BoardProps<AcesUpState, AcesUpAction>) {
  const tap = (i: number) => {
    if (canDiscard(state, i)) return dispatch({ type: 'discard', pile: i });
    const to = state.piles.findIndex((p) => !p.length);
    if (to >= 0) dispatch({ type: 'move', from: i, to });
  };
  const onDrop = (from: { pileId: string }, to: string) => {
    const f = Number(from.pileId.slice(1));
    if (to === 'discard' && canDiscard(state, f)) {
      dispatch({ type: 'discard', pile: f });
      return true;
    }
    const t = Number(to.slice(1));
    if (to[0] !== 'p' || !canMove(state, f, t)) return false;
    dispatch({ type: 'move', from: f, to: t });
    return true;
  };
  const discardable = new Set(state.piles.flatMap((p, i) => (canDiscard(state, i) ? [p.at(-1)!.id] : [])));

  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(6, 118, 4.2)} className="flex flex-col items-center gap-5 short:gap-2">
        <div className="flex items-start gap-[var(--gap)]">
          <Pile
            cards={state.stock}
            label={`Stock, ${state.stock.length} left`}
            onPileClick={() => dispatch({ type: 'deal' })}
            emptyLabel="✕"
          />
          {state.piles.map((p, i) => (
            <Pile
              key={i}
              id={`p${i}`}
              cards={p}
              layout="fan-down"
              spread={p.length > 8 ? 0.6 : 1}
              label={`Pile ${i + 1}`}
              onCardClick={() => tap(i)}
              isCardInteractive={(_, idx) => idx === p.length - 1}
              canDrag={(_, idx) => idx === p.length - 1}
              highlightedIds={discardable}
            />
          ))}
          <Pile id="discard" cards={state.discard} label="Discard pile" emptyLabel="" />
        </div>
        <p className="text-xs text-cream/60">
          Stock {state.stock.length} · Discarded {state.discard.length}/48
        </p>
      </div>
    </DragProvider>
  );
}
