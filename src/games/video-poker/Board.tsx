import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { columnsStyle } from '@/ui/table/Table';
import { MAX_BET, PAYTABLE, currentHandName, winFor, type VideoPokerAction, type VideoPokerState } from './logic';

export default function VideoPokerBoard({ state, dispatch }: BoardProps<VideoPokerState, VideoPokerAction>) {
  const holding = state.phase === 'hold';
  const hand = state.hand.length ? state.hand : [];

  return (
    <div style={columnsStyle(5, 120, 1.7)} className="layout-split flex flex-col gap-5">
      <table className="area-side w-full text-[11px] tabular-nums sm:text-xs">
        <thead className="sr-only">
          <tr>
            <th>Hand</th>
            {[1, 2, 3, 4, 5].map((b) => (
              <th key={b}>Bet {b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAYTABLE.map((row) => {
            const hit = state.phase === 'result' && state.result === row.key;
            return (
              <tr key={row.key} className={hit ? 'bg-gold/25 text-gold' : 'text-cream/75'}>
                <td className="py-0.5 pl-2 font-semibold">{row.name}</td>
                {[1, 2, 3, 4, 5].map((b) => (
                  <td key={b} className={`px-1 text-right ${b === state.bet ? 'text-cream' : 'opacity-60'}`}>
                    {winFor(row.key, b)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="area-main flex flex-col gap-5 short:gap-2">
        <div className="grid grid-cols-5 justify-items-center gap-[var(--gap)]">
          {hand.length
            ? hand.map((card, i) => (
                <div key={card.id} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`h-4 text-[11px] font-bold tracking-widest ${state.held[i] ? 'text-gold' : 'text-transparent'}`}
                  >
                    HELD
                  </span>
                  <Card
                    card={card}
                    selected={state.held[i]}
                    onClick={holding ? () => dispatch({ type: 'toggle', index: i }) : undefined}
                    style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}
                  />
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="h-4" />
                  <div className="pile-slot h-[var(--card-h)] w-[var(--card-w)]" />
                </div>
              ))}
        </div>

        <p className="min-h-6 text-center font-display text-lg text-gold" aria-live="polite">
          {state.phase === 'result'
            ? state.lastWin
              ? `${currentHandName(state)} — win ${state.lastWin}`
              : 'No win'
            : holding
              ? currentHandName(state)
              : ''}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-cream/70">Bet</span>
          {Array.from({ length: MAX_BET }, (_, i) => i + 1).map((b) => (
            <Button
              key={b}
              className={`w-10 ${state.bet === b ? 'ring-gold' : ''}`}
              onClick={() => dispatch({ type: 'bet', amount: b })}
              disabled={holding || b > state.credits}
              aria-pressed={state.bet === b}
            >
              {b}
            </Button>
          ))}
          <Button variant="primary" className="min-w-24" onClick={() => dispatch(holding ? { type: 'draw' } : { type: 'deal' })}>
            {holding ? 'Draw' : 'Deal'}
          </Button>
        </div>
        <p className="text-center text-sm text-cream/80 tabular-nums">Credits {state.credits}</p>
      </div>
    </div>
  );
}
