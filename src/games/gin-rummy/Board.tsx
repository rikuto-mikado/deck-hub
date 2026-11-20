import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Stat } from '@/ui/table/TableKit';
import type { CardId } from '@/core/types/card';
import { CPU, HUMAN, KNOCK, deadwoodAfter, deadwoodOf, type GinAction, type GinState } from './logic';

export default function GinBoard({ state, dispatch }: BoardProps<GinState, GinAction>) {
  const [picked, setPicked] = useResettableState<CardId | null>(() => null, [state.hands, state.phase]);
  const myDraw = state.phase === 'draw' && state.turn === HUMAN;
  const myDiscard = state.phase === 'discard' && state.turn === HUMAN;
  const hand = state.hands[HUMAN];
  const dwAfter = picked ? deadwoodAfter(hand, picked) : null;
  const r = state.result;
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(38px,min(9vw,calc((100dvh-300px)/2.9)),92px)]">
      <div className="area-seats flex flex-col items-center gap-1">
        <Stat label={state.seat.name} value={state.scores[CPU]} />
        <div className="seat-cards">
          <Pile cards={state.hands[CPU]} layout="fan-right" spread={0.8} label={`${state.seat.name}'s hand`} emptyLabel="" />
        </div>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile
            cards={state.stock}
            label={`Stock, ${state.stock.length} left`}
            onPileClick={myDraw ? () => dispatch({ type: 'draw', by: HUMAN, from: 'stock' }) : undefined}
            emptyLabel=""
          />
          <Pile
            cards={state.discard}
            label="Discard pile"
            onCardClick={myDraw ? () => dispatch({ type: 'draw', by: HUMAN, from: 'discard' }) : undefined}
            isCardInteractive={(_, i) => i === state.discard.length - 1}
            highlightedIds={myDraw && state.discard.length ? new Set([state.discard.at(-1)!.id]) : undefined}
            emptyLabel=""
          />
        </div>
        <Log>{state.log}</Log>
        {r && (
          <p className="text-center text-xs text-cream/70">
            Deadwood: you {r.deadwood[0].reduce((n, c) => n + Math.min(10, c.rank), 0)} · {state.seat.name}{' '}
            {r.deadwood[1].reduce((n, c) => n + Math.min(10, c.rank), 0)}
          </p>
        )}
        {state.phase === 'handOver' && (
          <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
            Next hand
          </Button>
        )}
      </div>
      <HandArea
        active={myDraw || myDiscard}
        prompt={
          <>
            You {state.scores[HUMAN]}/{state.target} · deadwood{' '}
            {deadwoodOf(hand.length > 10 && picked ? hand.filter((c) => c.id !== picked) : hand)}
            {myDraw ? ' — draw a card' : myDiscard ? ' — pick a card to discard' : ''}
          </>
        }
        actions={
          myDiscard && (
            <>
              <Button
                disabled={!picked || picked === state.taken}
                onClick={() => dispatch({ type: 'discard', by: HUMAN, id: picked!, knock: false })}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                disabled={!picked || picked === state.taken || dwAfter! > KNOCK}
                onClick={() => dispatch({ type: 'discard', by: HUMAN, id: picked!, knock: true })}
              >
                {dwAfter === 0 ? 'Gin!' : 'Knock'}
              </Button>
            </>
          )
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={1.25}
          label="Your hand"
          selectedIds={picked ? new Set([picked]) : undefined}
          onCardClick={myDiscard ? (c) => setPicked(picked === c.id ? null : c.id) : undefined}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
