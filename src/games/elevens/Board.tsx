import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { Stat } from '@/ui/table/TableKit';
import type { ElevensAction, ElevensState } from './logic';

export default function ElevensBoard({ state, dispatch }: BoardProps<ElevensState, ElevensAction>) {
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  return (
    <div className="layout-split flex flex-col items-center gap-4 [--card-w:clamp(40px,min(18vw,max(calc((100dvh-210px)/4.4),var(--card-floor))),120px)] md:flex-row md:justify-center md:gap-10">
      <div className="area-main grid grid-cols-3 gap-[calc(var(--card-w)*0.12)]">
        {state.grid.map((c, i) =>
          c ? (
            <Card
              key={c.id}
              card={c}
              style={size}
              selected={state.selected.includes(c.id)}
              onClick={() => dispatch({ type: 'select', cell: i })}
            />
          ) : (
            <div key={`e${i}`} className="pile-slot" style={size} />
          ),
        )}
      </div>
      <div className="area-side flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <Pile cards={state.stock} label={`Stock, ${state.stock.length} left`} emptyLabel="" />
          <Pile cards={state.removed} label="Removed" emptyLabel="" />
        </div>
        <Stat label="Cleared" value={`${state.removed.length}/52`} />
        <p className="max-w-56 text-center text-xs text-cream/65">Pick two cards that make 11, or a J, Q and K together.</p>
      </div>
    </div>
  );
}
