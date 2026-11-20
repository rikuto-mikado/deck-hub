import { SUITS, SUIT_SYMBOL, type CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { Badge, HandArea, Log } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, canPlay, type PageOneAction, type PageOneState } from './logic';

export default function PageOneBoard({ state, dispatch }: BoardProps<PageOneState, PageOneAction>) {
  const [call, setCall] = useResettableState(() => false, [state.hands[HUMAN]]);
  const [eight, setEight] = useResettableState<CardId | null>(() => null, [state.hands[HUMAN], state.turn]);
  const myTurn = state.turn === HUMAN && state.winner === null;
  const hand = state.hands[HUMAN]!;
  const ok = new Set<string>(
    myTurn ? hand.filter((c) => canPlay(state, c) && (!state.drew || state.drew === c.id)).map((c) => c.id) : [],
  );
  const play = (id: CardId) => {
    const card = hand.find((c) => c.id === id)!;
    if (card.rank === 8) setEight(id);
    else dispatch({ type: 'play', by: HUMAN, id, call });
  };
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat
            key={p}
            name={seatName(state.seats, p)}
            cards={state.hands[p]!}
            active={state.turn === p}
            note={state.hands[p]!.length === 1 ? 'Page One!' : undefined}
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile
            cards={state.stock}
            label="Stock"
            onPileClick={myTurn && !state.drew ? () => dispatch({ type: 'draw', by: HUMAN }) : undefined}
            emptyLabel=""
          />
          <Pile cards={state.pile} label="Discard pile" emptyLabel="" />
          <div className="flex flex-col items-center gap-1">
            <Badge>Suit {SUIT_SYMBOL[state.suit]}</Badge>
            <span className="text-lg text-cream/70">{state.dir === 1 ? '↻' : '↺'}</span>
          </div>
        </div>
        <Log>{state.log}</Log>
        {eight && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-cream/80">Call a suit:</span>
            {SUITS.map((x) => (
              <Button
                key={x}
                variant="primary"
                className="min-w-11"
                onClick={() => dispatch({ type: 'play', by: HUMAN, id: eight, suit: x, call })}
              >
                {SUIT_SYMBOL[x]}
              </Button>
            ))}
          </div>
        )}
      </div>
      <HandArea
        active={myTurn}
        prompt={myTurn ? (state.drew ? 'Play the card you drew, or pass' : 'Match suit or rank; 8s are wild') : 'Your hand'}
        actions={
          <>
            <Button
              className={`min-h-9 px-3 ${call ? 'ring-2 ring-gold' : ''}`}
              aria-pressed={call}
              onClick={() => setCall(!call)}
              disabled={hand.length !== 2}
            >
              “Page One!”
            </Button>
            <Button className="min-h-9" disabled={!myTurn || !!state.drew} onClick={() => dispatch({ type: 'draw', by: HUMAN })}>
              Draw
            </Button>
            <Button className="min-h-9" disabled={!myTurn || !state.drew} onClick={() => dispatch({ type: 'pass', by: HUMAN })}>
              Pass
            </Button>
          </>
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={hand.length > 10 ? 1.1 : 1.6}
          label="Your hand"
          highlightedIds={ok}
          selectedIds={eight ? new Set([eight]) : undefined}
          onCardClick={(c) => ok.has(c.id) && play(c.id)}
          isCardInteractive={(c) => ok.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
