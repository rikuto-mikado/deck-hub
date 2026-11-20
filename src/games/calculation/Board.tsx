import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { fits, needLabel, type CalculationAction, type CalculationState } from './logic';

export default function CalculationBoard({ state, dispatch }: BoardProps<CalculationState, CalculationAction>) {
  const onDrop = (from: { pileId: string }, to: string) => {
    if (from.pileId === 'current') {
      const ok = to[0] === 'w' || (to[0] === 'f' && !!state.current && fits(state, state.current, Number(to.slice(1))));
      if (ok) dispatch({ type: 'place', to });
      return ok;
    }
    if (to[0] !== 'f') return false;
    const w = Number(from.pileId.slice(1)),
      f = Number(to.slice(1));
    const card = state.wastes[w]?.at(-1);
    if (!card || !fits(state, card, f)) return false;
    dispatch({ type: 'move', from: w, to: f });
    return true;
  };
  const tapCurrent = () => {
    const f = [0, 1, 2, 3].find((i) => state.current && fits(state, state.current, i));
    if (f !== undefined) dispatch({ type: 'place', to: `f${f}` });
  };
  const tapWaste = (w: number) => {
    if (state.current) return dispatch({ type: 'place', to: `w${w}` });
    const card = state.wastes[w]!.at(-1);
    const f = [0, 1, 2, 3].find((i) => card && fits(state, card, i));
    if (f !== undefined) dispatch({ type: 'move', from: w, to: f });
  };
  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(6, 112, 4.6)} className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-[var(--gap)]">
          {state.foundations.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Pile
                id={`f${i}`}
                cards={f}
                label={`Foundation +${i + 1}`}
                onPileClick={state.current ? () => dispatch({ type: 'place', to: `f${i}` }) : undefined}
                slotHighlighted={!!state.current && fits(state, state.current, i)}
              />
              <span className="text-[11px] text-cream/70 tabular-nums">
                +{i + 1} · next {needLabel(state, i)}
              </span>
            </div>
          ))}
          <div className="w-[var(--gap)]" />
          <Pile
            cards={state.stock}
            label={`Stock, ${state.stock.length} left`}
            onPileClick={() => dispatch({ type: 'turn' })}
            emptyLabel=""
          />
          <Pile
            id="current"
            cards={state.current ? [state.current] : []}
            label="Card to place"
            onCardClick={tapCurrent}
            canDrag={() => true}
            emptyLabel=""
          />
        </div>
        <div className="flex items-start gap-[var(--gap)]">
          {state.wastes.map((w, i) => (
            <Pile
              key={i}
              id={`w${i}`}
              cards={w}
              layout="fan-down"
              spread={w.length > 8 ? 0.5 : 0.75}
              label={`Waste pile ${i + 1}`}
              onPileClick={() => tapWaste(i)}
              onCardClick={() => tapWaste(i)}
              isCardInteractive={(_, idx) => idx === w.length - 1}
              canDrag={(_, idx) => idx === w.length - 1 && !state.current}
              slotHighlighted={!!state.current}
            />
          ))}
        </div>
      </div>
    </DragProvider>
  );
}
