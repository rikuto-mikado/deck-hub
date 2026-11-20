import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Badge, HandArea, Log, Slot, Stat } from '@/ui/table/TableKit';
import { CPU, HUMAN, count, type CribbageAction, type CribbageState } from './logic';
import { countValue } from './scoring';

function Track({ value, target, label }: { value: number; target: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-cream/75">
      <span className="w-14 truncate">{label}</span>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
      </div>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function CribbageBoard({ state, dispatch }: BoardProps<CribbageState, CribbageAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.phase]);
  const discarding = state.phase === 'discard';
  const myPeg = state.phase === 'peg' && state.turn === HUMAN;
  const playable = new Set<string>(
    myPeg ? state.hands[HUMAN].filter((c) => count(state) + countValue(c) <= 31).map((c) => c.id) : [],
  );
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < 2) n.add(id);
      return n;
    });
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(38px,min(10vw,calc((100dvh-310px)/2.9)),92px)]">
      <div className="area-seats flex flex-wrap items-center justify-center gap-4">
        <div className="flex flex-col gap-1">
          <Track value={state.scores[HUMAN]} target={state.target} label="You" />
          <Track value={state.scores[CPU]} target={state.target} label={state.seat.name} />
        </div>
        <div className="seat-cards">
          <Pile cards={state.hands[CPU]} layout="fan-right" spread={0.9} label={`${state.seat.name}'s hand`} emptyLabel="" />
        </div>
        <Badge tone="dim">Dealer: {state.dealer === HUMAN ? 'you' : state.seat.name}</Badge>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        {state.phase === 'show' || (state.phase === 'matchOver' && state.show.length) ? (
          <div className="flex w-full max-w-md flex-col gap-1.5 rounded-xl bg-black/25 p-2 text-xs">
            {state.show.map((l) => (
              <div key={l.who} className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 font-semibold text-cream">{l.who}</span>
                {l.items.map((i, k) => (
                  <Badge key={k} tone="dim">
                    {i.label} +{i.points}
                  </Badge>
                ))}
                <span className="ml-auto font-semibold text-gold-bright tabular-nums">{l.total}</span>
              </div>
            ))}
            {state.phase === 'show' && (
              <Button variant="primary" className="mt-1 self-center" onClick={() => dispatch({ type: 'next' })}>
                Next hand
              </Button>
            )}
          </div>
        ) : (
          <div className="mid-cards flex items-center gap-3">
            <Slot card={state.starter} label="Starter" caption="starter" />
            <Pile cards={state.pile} layout="fan-right" spread={0.7} label="Pegging pile" emptyLabel="" />
            <Stat label="Count" value={count(state)} />
          </div>
        )}
        <Log>{state.log}</Log>
      </div>
      <HandArea
        active={discarding || myPeg}
        prompt={
          discarding
            ? `Choose two cards for the crib (${picked.size}/2)`
            : myPeg
              ? 'Play a card'
              : state.phase === 'show'
                ? 'Your hand'
                : 'Waiting…'
        }
        actions={
          <>
            {discarding && (
              <Button
                variant="primary"
                disabled={picked.size !== 2}
                onClick={() => dispatch({ type: 'discard', ids: [...picked] })}
              >
                To the crib
              </Button>
            )}
            {myPeg && !playable.size && (
              <Button variant="primary" onClick={() => dispatch({ type: 'go', by: HUMAN })}>
                Go
              </Button>
            )}
          </>
        }
      >
        <Pile
          cards={state.phase === 'show' ? state.kept[HUMAN] : state.hands[HUMAN]}
          layout="fan-right"
          spread={1.6}
          label="Your hand"
          selectedIds={picked}
          highlightedIds={myPeg ? playable : undefined}
          onCardClick={(c) => (discarding ? toggle(c.id) : playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id }))}
          isCardInteractive={(c) => discarding || playable.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
