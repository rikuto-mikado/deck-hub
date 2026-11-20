import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { Badge, HandArea, Log } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, canPlay, comboOf, type BigTwoAction, type BigTwoState } from './logic';

export default function BigTwoBoard({ state, dispatch }: BoardProps<BigTwoState, BigTwoAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands]);
  const myTurn = state.turn === HUMAN && state.winner === null;
  const hand = state.hands[HUMAN]!;
  const selection = hand.filter((c) => picked.has(c.id));
  const combo = selection.length ? comboOf(selection) : null;
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
            active={state.turn === p}
            note={state.table?.by === p ? 'on top' : undefined}
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex min-h-[var(--card-h)] flex-col items-center gap-1">
          {state.table && <Badge tone="dim">{state.table.combo.name}</Badge>}
          <Pile cards={state.table?.cards ?? []} layout="fan-right" spread={1.3} label="Cards on the table" emptyLabel="" />
        </div>
        <Log>{state.log}</Log>
      </div>
      <HandArea
        active={myTurn}
        prompt={
          myTurn
            ? state.table
              ? `Beat the ${state.table.combo.name} or pass`
              : state.opening
                ? 'Lead with the 3♦'
                : 'Lead anything'
            : 'Your hand'
        }
        actions={
          <>
            <Button
              variant="primary"
              disabled={!myTurn || !canPlay(state, HUMAN, selection)}
              onClick={() => dispatch({ type: 'play', by: HUMAN, ids: [...picked] })}
            >
              Play{combo ? ` ${combo.name}` : ''}
            </Button>
            <Button disabled={!myTurn || !state.table} onClick={() => dispatch({ type: 'pass', by: HUMAN })}>
              Pass
            </Button>
          </>
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={hand.length > 10 ? 1.15 : 1.6}
          label="Your hand"
          selectedIds={picked}
          onCardClick={myTurn ? (c) => toggle(c.id) : undefined}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
