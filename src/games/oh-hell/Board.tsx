import type { BoardProps } from '@/core/types/game';
import { SUIT_SYMBOL } from '@/core/types/card';
import { Button } from '@/ui/common/Button';
import { Badge, Slot } from '@/ui/table/TableKit';
import { TrickTable } from '@/ui/table/TrickTable';
import { seatName } from '../cpuLevel';
import { HUMAN, estimateBid, forbiddenBid, legal, toAct, trumpOf, type OhHellAction, type OhHellState } from './logic';

export default function OhHellBoard({ state, dispatch }: BoardProps<OhHellState, OhHellAction>) {
  const names = [0, 1, 2, 3].map((p) => seatName(state.seats, p) + (p === state.dealer ? ' (D)' : ''));
  const myTurn = toAct(state) === HUMAN;
  const bidding = state.phase === 'bid' && state.turn === HUMAN;
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  const n = state.schedule[state.round]!;
  const hook = forbiddenBid(state, HUMAN);
  return (
    <TrickTable
      showTrick={state.phase === 'play'}
      names={names}
      hands={state.hands}
      turn={state.phase === 'bid' ? state.turn : toAct(state)}
      trick={state.trick}
      notes={state.bids.map((b, p) => `${state.scores[p]} pts · ${b ?? '–'}/${state.tricks[p]}`)}
      header={
        <>
          <Badge tone="dim">
            Round {state.round + 1}/{state.schedule.length} · {n} card{n > 1 ? 's' : ''}
          </Badge>
          <Badge>Trump {SUIT_SYMBOL[trumpOf(state)]}</Badge>
          <span className="tabular-nums">
            You {state.scores[HUMAN]} · bid {state.bids[HUMAN] ?? '–'} · won {state.tricks[HUMAN]}
          </span>
        </>
      }
      centerExtra={<Slot card={state.trumpCard} label="Trump card" caption="trump" />}
      log={state.log}
      controls={
        <>
          {bidding && (
            <div className="flex max-w-md flex-wrap justify-center gap-1">
              {Array.from({ length: n + 1 }, (_, b) => (
                <Button
                  key={b}
                  className="min-h-9 min-w-10 px-2"
                  disabled={b === hook}
                  onClick={() => dispatch({ type: 'bid', by: HUMAN, bid: b })}
                >
                  {b}
                </Button>
              ))}
            </div>
          )}
          {state.phase === 'roundOver' && (
            <div className="flex flex-col items-center gap-2 text-xs text-cream/80">
              <span>{state.lastRound?.map((d, p) => `${seatName(state.seats, p)} +${d}`).join(' · ')}</span>
              <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
                Next round
              </Button>
            </div>
          )}
        </>
      }
      prompt={
        bidding
          ? `Bid exactly (about ${estimateBid(state, HUMAN)}${hook !== null ? `; not ${hook}` : ''})`
          : myTurn
            ? 'Your play'
            : 'Your hand'
      }
      playable={playable}
      onCardClick={(c) => playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id })}
    />
  );
}
