import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { Log, Stat } from '@/ui/table/TableKit';
import { BETS, GOAL_CHIPS, SPREAD_PAYS, TRIPS_PAYS, type RedDogAction, type RedDogState } from './logic';

export default function RedDogBoard({ state, dispatch }: BoardProps<RedDogState, RedDogAction>) {
  const betting = state.phase === 'bet' || state.phase === 'settled';
  const [a, b, c] = state.cards;
  const slot = (card: typeof a, label: string) => <Pile cards={card ? [card] : []} label={label} emptyLabel="" />;
  return (
    <div style={columnsStyle(6, 120, 3.2)} className="layout-split flex flex-col items-center gap-4">
      <div className="area-main flex flex-col items-center gap-3">
        <div className="flex items-center gap-[calc(var(--gap)*2)]">
          {slot(a, 'First card')}
          <div className="grid place-items-center rounded-2xl ring-1 ring-gold/40" style={{ padding: 'calc(var(--gap) / 2)' }}>
            {slot(c, 'Third card')}
          </div>
          {slot(b, 'Second card')}
        </div>
        <Log>{state.message}</Log>
      </div>
      <div className="area-side flex flex-col items-center gap-3">
        {state.phase === 'raise' ? (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => dispatch({ type: 'raise' })} disabled={state.chips < state.stake}>
              Raise ×2
            </Button>
            <Button onClick={() => dispatch({ type: 'stand' })}>Stand</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {BETS.map((x) => (
              <Button
                key={x}
                disabled={!betting || x > state.chips}
                aria-pressed={state.bet === x}
                className={state.bet === x ? 'ring-2 ring-gold' : ''}
                onClick={() => dispatch({ type: 'bet', amount: x })}
              >
                {x}
              </Button>
            ))}
            <Button
              variant="primary"
              className="min-w-24"
              disabled={!betting || state.bet > state.chips}
              onClick={() => dispatch({ type: 'deal' })}
            >
              Deal
            </Button>
          </div>
        )}
        <div className="flex gap-4">
          <Stat label="Chips" value={state.chips} />
          <Stat label="Goal" value={GOAL_CHIPS} />
        </div>
        <p className="text-center text-[11px] text-cream/60">
          Spread 1: {SPREAD_PAYS[0]}:1 · 2: {SPREAD_PAYS[1]}:1 · 3: {SPREAD_PAYS[2]}:1 · 4+: 1:1 · Trips {TRIPS_PAYS}:1
        </p>
      </div>
    </div>
  );
}
