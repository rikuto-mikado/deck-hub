import { SUITS, SUIT_SYMBOL } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Badge, Slot } from '@/ui/table/TableKit';
import { TrickTable } from '@/ui/table/TrickTable';
import { seatName } from '../cpuLevel';
import { HUMAN, legal, toAct, type EuchreAction, type EuchreState } from './logic';

export default function EuchreBoard({ state, dispatch }: BoardProps<EuchreState, EuchreAction>) {
  const [alone, setAlone] = useResettableState(() => false, [state.phase]);
  const names = [0, 1, 2, 3].map(
    (p) => seatName(state.seats, p) + (p === 2 ? ' (partner)' : '') + (p === state.dealer ? ' (D)' : ''),
  );
  const myTurn = toAct(state) === HUMAN;
  const ordering = (state.phase === 'order1' || state.phase === 'order2') && state.turn === HUMAN;
  const discarding = state.phase === 'discard';
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  const bidding = state.phase === 'order1' || state.phase === 'order2';
  return (
    <TrickTable
      showTrick={state.phase === 'play' || state.phase === 'handOver'}
      names={names}
      hands={state.hands}
      turn={bidding ? state.turn : discarding ? HUMAN : toAct(state)}
      trick={state.trick}
      notes={state.tricks.map((t, p) =>
        state.maker === p ? `Maker · ${t}` : state.alone && state.maker === (p + 2) % 4 ? 'Sits out' : `Tricks ${t}`,
      )}
      header={
        <>
          {state.trump ? <Badge>Trump {SUIT_SYMBOL[state.trump]}</Badge> : <Badge tone="dim">Choosing trump</Badge>}
          <span className="tabular-nums">
            Us {state.scores[0]} · Them {state.scores[1]} · to {state.target}
          </span>
        </>
      }
      centerExtra={
        bidding && (
          <Slot
            card={state.phase === 'order1' ? state.upcard : { ...state.upcard, faceUp: false }}
            label="Turned-up card"
            caption="upcard"
          />
        )
      }
      log={state.log}
      controls={
        <>
          {ordering && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <label className="flex items-center gap-1 text-xs text-cream/80">
                <input type="checkbox" checked={alone} onChange={(e) => setAlone(e.target.checked)} /> Go alone
              </label>
              {state.phase === 'order1' ? (
                <Button variant="primary" onClick={() => dispatch({ type: 'order', by: HUMAN, alone })}>
                  {state.dealer === HUMAN ? 'Pick it up' : 'Order up'} {SUIT_SYMBOL[state.upcard.suit]}
                </Button>
              ) : (
                SUITS.filter((x) => x !== state.upcard.suit).map((x) => (
                  <Button
                    key={x}
                    variant="primary"
                    className="min-w-12"
                    onClick={() => dispatch({ type: 'name', by: HUMAN, suit: x, alone })}
                  >
                    {SUIT_SYMBOL[x]}
                  </Button>
                ))
              )}
              <Button
                disabled={state.phase === 'order2' && state.dealer === HUMAN}
                onClick={() => dispatch({ type: 'pass', by: HUMAN })}
              >
                Pass
              </Button>
            </div>
          )}
          {state.phase === 'handOver' && (
            <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
              Next hand
            </Button>
          )}
        </>
      }
      prompt={discarding ? 'Discard one card' : ordering ? 'Your call' : myTurn ? 'Your play' : 'Your hand'}
      playable={discarding ? undefined : playable}
      onCardClick={(c) =>
        discarding
          ? dispatch({ type: 'discard', id: c.id })
          : playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id })
      }
      isCardInteractive={(c) => discarding || playable.has(c.id)}
    />
  );
}
