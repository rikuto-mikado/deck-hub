import type { BoardProps } from '@/core/types/game';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Slot, Stat } from '@/ui/table/TableKit';
import { CPU, HUMAN, type GopsAction, type GopsState } from './logic';

export default function GopsBoard({ state, dispatch }: BoardProps<GopsState, GopsAction>) {
  const myTurn = !state.bids[HUMAN] && state.hands[HUMAN].length > 0;
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(36px,min(10vw,calc((100dvh-300px)/2.9)),92px)]">
      <div className="area-seats flex flex-col items-center gap-1">
        <Stat label={state.seat.name} value={state.scores[CPU]} />
        <div className="seat-cards">
          <Pile cards={state.hands[CPU]} layout="fan-right" spread={0.6} label={`${state.seat.name}'s bids`} emptyLabel="" />
        </div>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-end gap-4">
          <Slot card={state.bids[CPU]} label={`${state.seat.name}'s bid`} caption={state.seat.name} />
          <div className="flex flex-col items-center gap-1">
            <Pile cards={state.pot} layout="fan-right" spread={0.5} label="Prize pot" emptyLabel="" />
            <span className="text-[11px] text-gold-bright">Prize {state.pot.reduce((n, c) => n + c.rank, 0)}</span>
          </div>
          <Slot card={state.bids[HUMAN]} label="Your bid" caption="You" />
          <Pile cards={state.prizes} label={`Prizes left, ${state.prizes.length}`} emptyLabel="" />
        </div>
        <Log>{state.log}</Log>
      </div>
      <HandArea
        active={myTurn}
        prompt={
          <>
            You {state.scores[HUMAN]} · round {Math.min(13, state.round)}/13 — {myTurn ? 'choose your bid' : 'revealing…'}
          </>
        }
      >
        <Pile
          cards={state.hands[HUMAN]}
          layout="fan-right"
          spread={1.25}
          label="Your bidding cards"
          onCardClick={myTurn ? (c) => dispatch({ type: 'bid', id: c.id }) : undefined}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
