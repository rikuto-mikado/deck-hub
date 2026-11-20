import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Stat } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, canPlayOn, source, type PalaceAction, type PalaceState } from './logic';

function Palace({
  state,
  p,
  onUp,
  onDown,
  picked,
}: {
  state: PalaceState;
  p: number;
  onUp?: ((id: CardId) => void) | undefined;
  onDown?: ((i: number) => void) | undefined;
  picked?: ReadonlySet<string> | undefined;
}) {
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  return (
    <div className="flex gap-[3px]">
      {[0, 1, 2].map((i) => {
        const down = state.down[p]![i];
        const up = state.up[p]![i];
        return (
          <div key={i} className="relative" style={{ width: 'var(--card-w)', height: 'calc(var(--card-h) * 1.15)' }}>
            {down && (
              <Card
                card={down}
                style={{ ...size, position: 'absolute', top: 0 }}
                onClick={onDown && !state.up[p]!.length ? () => onDown(i) : undefined}
              />
            )}
            {up && (
              <Card
                card={up}
                style={{ ...size, position: 'absolute', top: 'calc(var(--card-h) * 0.15)' }}
                selected={picked?.has(up.id) ?? false}
                onClick={onUp ? () => onUp(up.id) : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PalaceBoard({ state, dispatch }: BoardProps<PalaceState, PalaceAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.up]);
  const swapping = state.phase === 'swap';
  const myTurn = state.phase === 'play' && state.turn === HUMAN && !state.out.includes(HUMAN);
  const src = source(state, HUMAN);
  const hand = state.hands[HUMAN]!;
  const fromCards = src === 'up' ? state.up[HUMAN]! : hand;
  const selection = fromCards.filter((c) => picked.has(c.id));
  const canPlay =
    myTurn &&
    selection.length > 0 &&
    selection.every((c) => c.rank === selection[0]!.rank) &&
    canPlayOn(state.pile, selection[0]!);
  const toggle = (id: CardId) => {
    const n = new Set(picked);
    if (swapping) {
      // One hand card and one palace card: they swap as soon as both are chosen.
      const inHand = hand.some((c) => c.id === id);
      for (const x of n) if (hand.some((c) => c.id === x) === inHand) n.delete(x);
      n.add(id);
      const h = [...n].find((x) => hand.some((c) => c.id === x));
      const u = [...n].find((x) => state.up[HUMAN]!.some((c) => c.id === x));
      if (h && u) {
        dispatch({ type: 'swap', hand: h, up: u });
        return;
      }
    } else if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <div
            key={p}
            className={`seat-cards flex flex-col items-center gap-1 rounded-xl px-1 py-1 ${state.turn === p && !swapping ? 'bg-gold/15 ring-1 ring-gold/60' : ''}`}
          >
            <span className="text-xs text-cream">
              {seatName(state.seats, p)}{' '}
              <span className="text-cream/60">{state.out.includes(p) ? 'out' : `${state.hands[p]!.length} in hand`}</span>
            </span>
            <Palace state={state} p={p} />
          </div>
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile cards={state.stock} label={`Stock, ${state.stock.length} left`} emptyLabel="" />
          <Pile
            cards={state.pile}
            layout="fan-right"
            spread={0.25}
            maxFan={4}
            label={`Pile, ${state.pile.length} cards`}
            emptyLabel=""
          />
          <Stat label="Burned" value={state.burned} />
        </div>
        <Log>{state.log}</Log>
      </div>
      <HandArea
        active={swapping || myTurn}
        prompt={
          swapping
            ? 'Tap a hand card and a palace card to swap them'
            : !myTurn
              ? 'Your palace'
              : src === 'down'
                ? 'Flip one of your blind palace cards'
                : src === 'up'
                  ? 'Play from your face-up palace'
                  : 'Play equal or higher, or pick up the pile'
        }
        actions={
          swapping ? (
            <Button variant="primary" onClick={() => dispatch({ type: 'ready' })}>
              Ready
            </Button>
          ) : (
            myTurn &&
            src !== 'down' && (
              <>
                <Button
                  variant="primary"
                  disabled={!canPlay}
                  onClick={() => dispatch({ type: 'play', by: HUMAN, ids: [...picked] })}
                >
                  Play
                </Button>
                <Button disabled={!state.pile.length} onClick={() => dispatch({ type: 'pickup', by: HUMAN })}>
                  Pick up
                </Button>
              </>
            )
          )
        }
      >
        <div className="flex flex-wrap items-end justify-center gap-4">
          <Palace
            state={state}
            p={HUMAN}
            picked={picked}
            onUp={swapping || (myTurn && src === 'up') ? toggle : undefined}
            onDown={myTurn && src === 'down' ? (i) => dispatch({ type: 'blind', by: HUMAN, index: i }) : undefined}
          />
          <Pile
            cards={hand}
            layout="fan-right"
            spread={hand.length > 10 ? 1 : 1.5}
            label="Your hand"
            selectedIds={picked}
            onCardClick={swapping || (myTurn && src === 'hand') ? (c) => toggle(c.id) : undefined}
            emptyLabel=""
          />
        </div>
      </HandArea>
    </div>
  );
}
