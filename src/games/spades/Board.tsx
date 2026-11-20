import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Badge } from '@/ui/table/TableKit';
import { TrickTable } from '@/ui/table/TrickTable';
import { seatName } from '../cpuLevel';
import { HUMAN, estimateBid, legal, toAct, type SpadesAction, type SpadesState } from './logic';

const bidText = (b: number | null) => (b === null ? '—' : b === 0 ? 'Nil' : String(b));

export default function SpadesBoard({ state, dispatch }: BoardProps<SpadesState, SpadesAction>) {
  const names = [0, 1, 2, 3].map((p) => seatName(state.seats, p) + (p === 2 ? ' (partner)' : ''));
  const myTurn = toAct(state) === HUMAN;
  const bidding = state.phase === 'bid' && state.turn === HUMAN;
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  return (
    <TrickTable
      showTrick={state.phase === 'play'}
      names={names}
      hands={state.hands}
      turn={state.phase === 'bid' ? state.turn : toAct(state)}
      trick={state.trick}
      notes={state.bids.map((b, p) => `Bid ${bidText(b)} · Won ${state.tricks[p]}`)}
      header={
        <>
          <Badge>Trump ♠</Badge>
          {state.broken && <Badge tone="dim">♠ broken</Badge>}
          <span className="tabular-nums">
            Us {state.scores[0]} ({state.bags[0]} bags) · Them {state.scores[1]} ({state.bags[1]} bags) · to {state.target}
          </span>
        </>
      }
      log={state.log}
      controls={
        <>
          {bidding && (
            <div className="flex max-w-md flex-wrap justify-center gap-1">
              {Array.from({ length: 14 }, (_, b) => (
                <Button key={b} className="min-h-9 min-w-10 px-2" onClick={() => dispatch({ type: 'bid', by: HUMAN, bid: b })}>
                  {b === 0 ? 'Nil' : b}
                </Button>
              ))}
            </div>
          )}
          {state.phase === 'handOver' && (
            <div className="flex flex-col items-center gap-2 text-xs text-cream/80">
              <span>
                This hand: us {state.lastHand?.[0]} · them {state.lastHand?.[1]}
              </span>
              <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
                Next hand
              </Button>
            </div>
          )}
        </>
      }
      prompt={bidding ? `Your bid (hint: about ${estimateBid(state, HUMAN)})` : myTurn ? 'Your play' : 'Your hand'}
      playable={playable}
      onCardClick={(c) => playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id })}
    />
  );
}
