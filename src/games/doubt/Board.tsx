import { rankLabel, type CardId, type Rank } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { Badge, HandArea, Log } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, pendingResponder, type DoubtAction, type DoubtState } from './logic';

export default function DoubtBoard({ state, dispatch }: BoardProps<DoubtState, DoubtAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.phase]);
  const myTurn = state.phase === 'play' && state.turn === HUMAN && state.winner === null;
  const responding = pendingResponder(state) === HUMAN;
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < 4) n.add(id);
      return n;
    });
  const claimRank = state.claim ? rankLabel(state.claim.rank as Rank) : rankLabel(state.rank as Rank);
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat
            key={p}
            name={seatName(state.seats, p)}
            cards={state.hands[p]!}
            active={state.turn === p && state.phase === 'play'}
            note={
              state.challenger === p ? 'Doubt!' : state.claim?.by === p ? `${state.claim.ids.length} × ${claimRank}` : undefined
            }
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile
            cards={state.pile}
            layout="fan-right"
            spread={state.phase === 'reveal' ? 0.5 : 0.08}
            maxFan={state.phase === 'reveal' ? 4 : 99}
            label={`Centre pile, ${state.pile.length} cards`}
            emptyLabel=""
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-cream/60">{state.claim ? 'Claimed' : 'Now playing'}</span>
            <Badge>{claimRank}</Badge>
            <span className="text-[11px] text-cream/60">{state.pile.length} in pile</span>
          </div>
        </div>
        <Log>{state.log}</Log>
        {responding && (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => dispatch({ type: 'respond', by: HUMAN, doubt: true })}>
              Doubt!
            </Button>
            <Button onClick={() => dispatch({ type: 'respond', by: HUMAN, doubt: false })}>Let it go</Button>
          </div>
        )}
      </div>
      <HandArea
        active={myTurn || responding}
        prompt={
          myTurn
            ? `Play 1–4 cards as ${claimRank}s (${picked.size} chosen)`
            : responding
              ? `${seatName(state.seats, state.claim!.by)} claims ${state.claim!.ids.length} × ${claimRank}`
              : 'Your hand'
        }
        actions={
          myTurn && (
            <Button
              variant="primary"
              disabled={!picked.size}
              onClick={() => dispatch({ type: 'play', by: HUMAN, ids: [...picked] })}
            >
              Play as {claimRank}
            </Button>
          )
        }
      >
        <Pile
          cards={state.hands[HUMAN]!}
          layout="fan-right"
          spread={state.hands[HUMAN]!.length > 14 ? 0.9 : 1.3}
          label="Your hand"
          selectedIds={picked}
          onCardClick={myTurn ? (c) => toggle(c.id) : undefined}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
