import { SUIT_SYMBOL } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { Badge, HandArea, Log, Stat } from '@/ui/table/TableKit';
import {
  CPU,
  HUMAN,
  canClose,
  canExchange,
  legal,
  marriages,
  strict,
  toAct,
  type SchnapsenAction,
  type SchnapsenState,
} from './logic';

export default function SchnapsenBoard({ state, dispatch }: BoardProps<SchnapsenState, SchnapsenAction>) {
  const myTurn = toAct(state) === HUMAN;
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  const myMarriages = marriages(state, HUMAN);
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(40px,min(11vw,max(calc((100dvh-300px)/2.9),var(--card-floor))),100px)]">
      <div className="area-seats flex flex-col items-center gap-1">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <Badge>Trump {SUIT_SYMBOL[state.trump]}</Badge>
          {strict(state) && <Badge tone="red">{state.closedBy !== null ? 'Closed' : 'Talon empty'}</Badge>}
          <Stat label={state.seat.name} value={`${state.points[CPU]}${state.pending[CPU] ? ` (+${state.pending[CPU]})` : ''}`} />
          <Stat label="Game points" value={`${state.gamePoints[0]} – ${state.gamePoints[1]}`} />
        </div>
        <div className="seat-cards">
          <Pile cards={state.hands[CPU]} layout="fan-right" spread={0.9} label={`${state.seat.name}'s hand`} emptyLabel="" />
        </div>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <div className="relative" style={{ width: 'calc(var(--card-w) * 1.6)', height: 'var(--card-h)' }}>
            {state.trumpCard && (
              <div className="absolute top-[12%] left-0 rotate-90">
                <Pile cards={[state.trumpCard]} label="Trump card" />
              </div>
            )}
            <div className="absolute top-0 right-0">
              <Pile cards={state.talon} label={`Talon, ${state.talon.length} left`} emptyLabel="" />
            </div>
          </div>
          <Pile cards={state.trick.map((t) => t.card)} layout="fan-right" spread={1.2} label="Current trick" emptyLabel="" />
        </div>
        <Log>{state.log}</Log>
        {state.phase === 'dealOver' && (
          <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
            Next deal
          </Button>
        )}
      </div>
      <HandArea
        active={myTurn}
        prompt={
          <>
            You {state.points[HUMAN]}
            {state.pending[HUMAN] ? ` (+${state.pending[HUMAN]})` : ''} / 66 ·{' '}
            {myTurn ? (state.marriage ? 'play the King or Queen' : 'your play') : 'wait'}
          </>
        }
        actions={
          <>
            {myMarriages.map((x) => (
              <Button key={x} className="min-h-9 px-3" onClick={() => dispatch({ type: 'marry', by: HUMAN, suit: x })}>
                Marry {SUIT_SYMBOL[x]} (+{x === state.trump ? 40 : 20})
              </Button>
            ))}
            {canExchange(state, HUMAN) && (
              <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'exchange', by: HUMAN })}>
                Swap trump J
              </Button>
            )}
            {canClose(state, HUMAN) && (
              <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'close', by: HUMAN })}>
                Close
              </Button>
            )}
          </>
        }
      >
        <Pile
          cards={state.hands[HUMAN]}
          layout="fan-right"
          spread={1.7}
          label="Your hand"
          highlightedIds={playable}
          onCardClick={(c) => playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id })}
          isCardInteractive={(c) => playable.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
