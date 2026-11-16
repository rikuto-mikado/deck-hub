import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { odds, type HighLowAction, type HighLowState } from './logic';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function HighLowBoard({ state, dispatch }: BoardProps<HighLowState, HighLowAction>) {
  const o = odds(state);
  const message = { right: 'Correct!', push: 'Same rank — no change.', wrong: 'Missed!', null: 'Higher or lower?' }[
    String(state.outcome) as 'null'
  ];

  return (
    <div style={columnsStyle(4, 130, 2.5)} className="flex flex-col items-center gap-6 py-2 short:gap-3 short:py-0">
      <div className="flex items-center gap-[calc(var(--gap)*3)]">
        <div className="flex flex-col items-center gap-1 text-xs text-cream/65">
          <Pile cards={state.deck} label="Deck" />
          {state.deck.length} left
        </div>
        <Pile cards={state.shown} label="Current card" />
      </div>
      <p className="font-display text-xl text-gold" aria-live="polite">
        {message}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" className="min-w-32" onClick={() => dispatch({ type: 'guess', guess: 'higher' })}>
          ▲ Higher <span className="text-xs opacity-70">{pct(o.higher)}</span>
        </Button>
        <Button variant="primary" className="min-w-32" onClick={() => dispatch({ type: 'guess', guess: 'lower' })}>
          ▼ Lower <span className="text-xs opacity-70">{pct(o.lower)}</span>
        </Button>
      </div>
      <p className="text-sm text-cream/80">Streak {state.streak}</p>
    </div>
  );
}
