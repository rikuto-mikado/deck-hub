import { SUITS, type StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { seatName } from '../cpuLevel';
import { HUMAN, MAX_PASSES, PLAYERS, isPlayable, type SevensAction, type SevensState } from './logic';

export default function SevensBoard({ state, dispatch }: BoardProps<SevensState, SevensAction>) {
  const myTurn = state.turn === HUMAN && !state.finished.includes(HUMAN) && !state.busted.includes(HUMAN);
  const hand = state.hands[HUMAN]!;
  const playable = new Set(hand.filter((c) => isPlayable(state, c)).map((c) => c.id));
  const note = (p: number) =>
    state.busted.includes(p)
      ? 'Bust'
      : state.finished.includes(p)
        ? `${['1st', '2nd', '3rd', '4th'][state.finished.indexOf(p)]}`
        : `Passes ${state.passes[p]}/${MAX_PASSES}`;

  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat key={p} name={seatName(state.seats, p)} cards={state.hands[p]!} active={state.turn === p} note={note(p)} />
        ))}
      </div>

      <div className="sevens-board area-main flex flex-col items-center gap-[3px]">
        {SUITS.map((suit) => (
          <div key={suit} className="flex gap-[2px]">
            {Array.from({ length: 13 }, (_, i) => {
              const card = state.board[suit][i + 1];
              const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
              return card ? <Card key={card.id} card={card} style={size} /> : <div key={i} className="pile-slot" style={size} />;
            })}
          </div>
        ))}
      </div>

      <div className="area-side flex flex-col gap-3 short:gap-2">
        <p className="text-center text-sm text-cream/85 short:text-left" aria-live="polite">
          {state.log}
        </p>

        <div
          className={`hand-cards flex flex-col items-center gap-2 rounded-xl py-2 short:[--card-w:46px] ${myTurn ? 'bg-gold/10 ring-1 ring-gold/50' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-cream/70">
            <span>
              {myTurn ? (playable.size ? 'Your turn — play a highlighted card' : 'No legal card — you must pass') : 'Your hand'}
            </span>
            <Button onClick={() => dispatch({ type: 'pass', by: HUMAN })} disabled={!myTurn}>
              {state.passes[HUMAN]! >= MAX_PASSES ? 'Pass (bust!)' : `Pass ${state.passes[HUMAN]}/${MAX_PASSES}`}
            </Button>
          </div>
          <Pile
            cards={hand}
            layout="fan-right"
            spread={hand.length > 9 ? 1.2 : 1.8}
            label="Your hand"
            highlightedIds={myTurn ? playable : undefined}
            onCardClick={myTurn ? (c) => dispatch({ type: 'play', by: HUMAN, id: (c as StandardCard).id }) : undefined}
            isCardInteractive={(c) => playable.has(c.id)}
            emptyLabel=""
          />
        </div>
      </div>
    </div>
  );
}
