import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import {
  BETS,
  canDouble,
  canSplit,
  canSurrender,
  handValue,
  type BlackjackAction,
  type BlackjackState,
  type Hand,
} from './logic';

const OUTCOME_TEXT = {
  blackjack: 'Blackjack!',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surrendered',
} as const;

function Total({ cards }: { cards: Hand['cards'] }) {
  if (!cards.length) return null;
  const { total, soft } = handValue(cards);
  return (
    <span className="rounded bg-black/30 px-1.5 py-0.5 text-sm text-cream tabular-nums">
      {soft && total < 21 ? `${total - 10} / ${total}` : total}
    </span>
  );
}

export default function BlackjackBoard({ state, dispatch }: BoardProps<BlackjackState, BlackjackAction>) {
  const betting = state.phase === 'bet' || state.phase === 'settled';
  const many = state.hands.length > 1;

  return (
    <div style={columnsStyle(many ? 8 : 6, 100, 3.4)} className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-cream/80">
            Dealer <Total cards={state.dealer} />
          </div>
          <Pile cards={state.dealer} layout="fan-right" label="Dealer hand" spread={2.4} emptyLabel="" />
        </div>
        <div className="flex flex-col items-center gap-1 text-[11px] text-cream/60">
          <Pile cards={state.shoe.slice(-6)} label="Shoe" />
          {state.rules.decks}-deck shoe
        </div>
      </div>

      <p className="min-h-7 text-center text-sm text-cream/85" aria-live="polite">
        {state.message}
        {state.insurancePayout ? ` Insurance pays ${state.insurancePayout}.` : ''}
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {state.hands.map((h, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 rounded-xl p-2 ${state.phase === 'player' && i === state.active ? 'bg-gold/10 ring-1 ring-gold/60' : ''}`}
          >
            <div className="flex items-center gap-2 text-sm text-cream/80">
              {many ? `Hand ${i + 1}` : 'You'} <Total cards={h.cards} />
              <span className="text-xs text-cream/60">Bet {h.bet * (h.doubled ? 2 : 1)}</span>
              {h.outcome && (
                <span
                  className={`text-xs font-semibold ${h.payout > h.bet * (h.doubled ? 2 : 1) ? 'text-gold' : 'text-cream/70'}`}
                >
                  {OUTCOME_TEXT[h.outcome]}
                  {h.payout ? ` +${h.payout}` : ''}
                </span>
              )}
            </div>
            <Pile cards={h.cards} layout="fan-right" label={`Hand ${i + 1}`} spread={2.4} emptyLabel="" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {betting ? (
          <>
            {BETS.map((b) => (
              <Button
                key={b}
                onClick={() => dispatch({ type: 'bet', amount: b })}
                disabled={b > state.chips}
                aria-pressed={state.bet === b}
                className={state.bet === b ? 'ring-2 ring-gold' : ''}
              >
                {b}
              </Button>
            ))}
            <Button
              variant="primary"
              className="min-w-24"
              onClick={() => dispatch({ type: 'deal' })}
              disabled={state.bet > state.chips}
            >
              Deal
            </Button>
          </>
        ) : state.phase === 'insurance' ? (
          <>
            <Button
              variant="primary"
              onClick={() => dispatch({ type: 'insurance', take: true })}
              disabled={Math.floor(state.bet / 2) > state.chips}
            >
              Take insurance ({Math.floor(state.bet / 2)})
            </Button>
            <Button onClick={() => dispatch({ type: 'insurance', take: false })}>No insurance</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => dispatch({ type: 'hit' })} disabled={state.phase !== 'player'}>
              Hit
            </Button>
            <Button variant="primary" onClick={() => dispatch({ type: 'stand' })} disabled={state.phase !== 'player'}>
              Stand
            </Button>
            <Button onClick={() => dispatch({ type: 'double' })} disabled={!canDouble(state)}>
              Double
            </Button>
            <Button onClick={() => dispatch({ type: 'split' })} disabled={!canSplit(state)}>
              Split
            </Button>
            {state.rules.surrender && (
              <Button onClick={() => dispatch({ type: 'surrender' })} disabled={!canSurrender(state)}>
                Surrender
              </Button>
            )}
          </>
        )}
      </div>
      <p className="text-center text-sm text-cream/80 tabular-nums">Chips {state.chips}</p>
    </div>
  );
}
