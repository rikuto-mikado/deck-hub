import type { BoardProps } from '@/core/types/game';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { canPlay, type GolfAction, type GolfState } from './logic';

export default function GolfBoard({ state, dispatch }: BoardProps<GolfState, GolfAction>) {
  return (
    <div style={columnsStyle(7, 118, 2.9)} className="flex flex-col gap-5">
      <div className="flex justify-between gap-[var(--gap)]">
        {state.columns.map((col, i) => (
          <Pile
            key={i}
            cards={col}
            layout="fan-down"
            label={`Column ${i + 1}`}
            onCardClick={() => dispatch({ type: 'play', column: i })}
            isCardInteractive={(_, idx) => idx === col.length - 1}
            highlightedIds={canPlay(state, i) ? new Set([col.at(-1)!.id]) : undefined}
          />
        ))}
      </div>
      <div className="flex items-start gap-[var(--gap)]">
        <Pile
          cards={state.stock}
          label={`Stock, ${state.stock.length} left`}
          onPileClick={() => dispatch({ type: 'draw' })}
          emptyLabel="—"
        />
        <Pile cards={state.waste} layout="fan-right" maxFan={4} label="Waste" />
        <span className="ml-auto self-end text-xs text-cream/60">Stock {state.stock.length}</span>
      </div>
    </div>
  );
}
