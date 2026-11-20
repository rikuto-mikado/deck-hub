import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { Log, Stat } from '@/ui/table/TableKit';
import { BETS, GOAL_CHIPS, handTotal, type BaccaratAction, type BaccaratState, type Side } from './logic';

const SIDES: { side: Side; label: string; pays: string }[] = [
  { side: 'player', label: 'Player', pays: '1:1' },
  { side: 'tie', label: 'Tie', pays: '8:1' },
  { side: 'banker', label: 'Banker', pays: '0.95:1' },
];
const DOT: Record<Side, string> = { player: 'bg-[#2f5fb3]', banker: 'bg-[#b3362f]', tie: 'bg-[#3c8a5a]' };

export default function BaccaratBoard({ state, dispatch }: BoardProps<BaccaratState, BaccaratAction>) {
  const betting = state.phase !== 'dealing';
  const hand = (who: 'player' | 'banker', label: string) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-cream/80">
        {label}
        {state[who].length > 0 && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-cream tabular-nums">{handTotal(state[who])}</span>
        )}
      </div>
      <Pile cards={state[who]} layout="fan-right" spread={2.2} label={`${label} hand`} emptyLabel="" />
    </div>
  );
  return (
    <div style={columnsStyle(8, 110, 3.4)} className="flex flex-col gap-4 short:gap-2">
      <div className="flex items-start justify-center gap-[calc(var(--gap)*4)]">
        {hand('player', 'Player')}
        {hand('banker', 'Banker')}
      </div>
      <Log>{state.message}</Log>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SIDES.map(({ side, label, pays }) => (
          <Button
            key={side}
            disabled={!betting}
            aria-pressed={state.side === side}
            onClick={() => dispatch({ type: 'side', side })}
            className={state.side === side ? 'ring-2 ring-gold' : ''}
          >
            {label} <span className="text-[11px] text-cream/60">{pays}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {BETS.map((b) => (
          <Button
            key={b}
            disabled={!betting || b > state.chips}
            aria-pressed={state.bet === b}
            onClick={() => dispatch({ type: 'bet', amount: b })}
            className={state.bet === b ? 'ring-2 ring-gold' : ''}
          >
            {b}
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
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Stat label="Chips" value={state.chips} />
        <Stat label="Goal" value={GOAL_CHIPS} />
        <div className="flex max-w-72 flex-wrap gap-1" aria-label="Recent results">
          {state.road.map((r, i) => (
            <span key={i} className={`size-2.5 rounded-full ${DOT[r]}`} title={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
