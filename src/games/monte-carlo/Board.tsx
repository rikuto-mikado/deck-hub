import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { Stat } from '@/ui/table/TableKit';
import { canConsolidate, type MonteCarloAction, type MonteCarloState } from './logic';

export default function MonteCarloBoard({ state, dispatch }: BoardProps<MonteCarloState, MonteCarloAction>) {
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  return (
    <div className="layout-split flex flex-col items-center gap-4 [--card-w:clamp(30px,min(13vw,calc((100dvh-200px)/7.4)),92px)] md:flex-row md:justify-center md:gap-10">
      <div className="area-main grid grid-cols-[repeat(5,var(--card-w))] gap-[calc(var(--card-w)*0.08)]">
        {state.grid.map((c, i) =>
          c ? (
            <Card
              key={c.id}
              card={c}
              style={size}
              selected={state.selected === c.id}
              onClick={() => dispatch({ type: 'select', cell: i })}
            />
          ) : (
            <div key={`gap${i}`} className="pile-slot" style={size} />
          ),
        )}
      </div>
      <div className="area-side flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Pile cards={state.stock} label={`Stock, ${state.stock.length} left`} emptyLabel="" />
          <Pile cards={state.removed} label="Removed pairs" emptyLabel="" />
        </div>
        <Button variant="primary" onClick={() => dispatch({ type: 'consolidate' })} disabled={!canConsolidate(state)}>
          Consolidate &amp; deal
        </Button>
        <Stat label="Pairs" value={`${state.removed.length / 2}/26`} />
      </div>
    </div>
  );
}
