import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { CPU, HUMAN, type ConcentrationAction, type ConcentrationState } from './logic';

function Side({ state, who, label }: { state: ConcentrationState; who: number; label: string }) {
  const won = state.cards.filter((_, i) => state.owner[i] === who).map((c) => ({ ...c, faceUp: true }));
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1 ${state.turn === who ? 'bg-gold/15 ring-1 ring-gold/50' : ''}`}>
      <Pile cards={won} label={`${label} pairs`} emptyLabel="" />
      <div className="text-sm text-cream">
        <div className="font-semibold">{label}</div>
        <div className="text-cream/70 tabular-nums">{state.pairs[who]} pairs</div>
      </div>
    </div>
  );
}

export default function ConcentrationBoard({ state, dispatch }: BoardProps<ConcentrationState, ConcentrationAction>) {
  const yourTurn = state.turn === HUMAN && state.flipped.length < 2;

  return (
    <div className="concentration flex flex-col gap-3">
      <div className="flex items-center justify-between" style={{ '--card-w': '34px' } as React.CSSProperties}>
        <Side state={state} who={HUMAN} label="You" />
        <span className="text-xs text-cream/70" aria-live="polite">
          {state.turn === HUMAN ? 'Your turn' : 'CPU is thinking…'}
        </span>
        <Side state={state} who={CPU} label="CPU" />
      </div>
      <div className="concentration-grid grid justify-center gap-[calc(var(--gap)*0.6)]">
        {state.cards.map((card, i) =>
          state.owner[i] === null ? (
            <Card
              key={card.id}
              card={card}
              style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}
              onClick={yourTurn && !card.faceUp ? () => dispatch({ type: 'flip', by: HUMAN, index: i }) : undefined}
            />
          ) : (
            <div key={`gap-${i}`} style={{ width: 'var(--card-w)', height: 'var(--card-h)' }} />
          ),
        )}
      </div>
    </div>
  );
}
