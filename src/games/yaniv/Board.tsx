import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { HandArea, Log } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { CALL_AT, HUMAN, PLAYERS, canCall, handTotal, isGroup, type YanivAction, type YanivState } from './logic';

export default function YanivBoard({ state, dispatch }: BoardProps<YanivState, YanivAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands]);
  const myTurn = state.phase === 'play' && state.turn === HUMAN;
  const hand = state.hands[HUMAN]!;
  const selection = hand.filter((c) => picked.has(c.id));
  const drawing = myTurn && !!state.pending;
  const ends = new Set<string>(drawing ? [state.top[0]!.id, state.top.at(-1)!.id] : []);
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat
            key={p}
            name={seatName(state.seats, p)}
            cards={state.hands[p]!}
            active={state.turn === p && state.phase === 'play'}
            note={state.phase === 'play' ? `${state.scores[p]} pts` : `${state.scores[p]} (+${state.lastRound?.delta[p] ?? 0})`}
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile
            cards={state.stock}
            label="Stock"
            onPileClick={drawing ? () => dispatch({ type: 'draw', by: HUMAN, from: 'stock' }) : undefined}
            emptyLabel=""
          />
          <Pile
            cards={state.top}
            layout="fan-right"
            spread={1}
            label="Previous discard"
            highlightedIds={ends}
            onCardClick={
              drawing
                ? (c) =>
                    ends.has(c.id) && dispatch({ type: 'draw', by: HUMAN, from: c.id === state.top[0]!.id ? 'first' : 'last' })
                : undefined
            }
            isCardInteractive={(c) => ends.has(c.id)}
            emptyLabel=""
          />
          {state.pending && <Pile cards={state.pending} layout="fan-right" spread={0.8} label="Your discard" emptyLabel="" />}
        </div>
        <Log>{state.log}</Log>
        {state.phase === 'roundOver' && (
          <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
            Next round
          </Button>
        )}
      </div>
      <HandArea
        active={myTurn}
        prompt={
          <>
            You {state.scores[HUMAN]}/{state.limit} · hand {handTotal(hand)} —{' '}
            {!myTurn
              ? 'wait'
              : drawing
                ? 'draw from the stock or take an end card'
                : `discard a card, set or run${handTotal(hand) <= CALL_AT ? ', or call Yaniv' : ''}`}
          </>
        }
        actions={
          myTurn &&
          !drawing && (
            <>
              <Button
                variant="primary"
                disabled={!selection.length || !isGroup(selection)}
                onClick={() => dispatch({ type: 'discard', by: HUMAN, ids: [...picked] })}
              >
                Discard
              </Button>
              <Button disabled={!canCall(state, HUMAN)} onClick={() => dispatch({ type: 'yaniv', by: HUMAN })}>
                Yaniv!
              </Button>
            </>
          )
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={1.7}
          label="Your hand"
          selectedIds={picked}
          onCardClick={myTurn && !drawing ? (c) => toggle(c.id) : undefined}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
