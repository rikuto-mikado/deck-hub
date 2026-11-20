import type { BoardProps } from '@/core/types/game';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, ordinal, targetOf, type OldMaidAction, type OldMaidState } from './logic';

export default function OldMaidBoard({ state, dispatch }: BoardProps<OldMaidState, OldMaidAction>) {
  const myTurn = state.turn === HUMAN && state.hands[HUMAN]!.length > 0;
  const target = targetOf(state, HUMAN);
  const place = (p: number) => (state.finished.includes(p) ? `${ordinal(state.finished.indexOf(p) + 1)} out` : undefined);

  return (
    <div className="layout-table flex flex-col gap-4">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat
            key={p}
            name={seatName(state.seats, p)}
            cards={state.hands[p]!}
            active={state.turn === p}
            note={place(p) ?? (myTurn && p === target ? 'Pick a card ↓' : undefined)}
            onCardClick={myTurn && p === target ? (_, index) => dispatch({ type: 'draw', by: HUMAN, index }) : undefined}
          />
        ))}
      </div>
      <div className="mid-cards area-side flex items-center justify-center gap-4 short:justify-start">
        <Pile cards={state.discard} label="Discarded pairs" emptyLabel="" />
        <p className="max-w-56 text-sm text-cream/85" aria-live="polite">
          {state.log}
        </p>
      </div>
      <div
        className={`hand-cards area-main flex flex-col items-center gap-2 rounded-xl py-2 ${myTurn ? 'bg-gold/10 ring-1 ring-gold/50' : ''}`}
      >
        <span className="text-xs text-cream/70">
          {myTurn ? `Your turn — draw from ${seatName(state.seats, target)}` : 'Your hand'}
        </span>
        <Pile cards={state.hands[HUMAN]!} layout="fan-right" spread={1.5} label="Your hand" emptyLabel="" />
      </div>
    </div>
  );
}
