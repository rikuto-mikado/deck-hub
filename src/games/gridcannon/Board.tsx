import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Log, Stat } from '@/ui/table/TableKit';
import { ARMOR, canPlace, type GridcannonAction, type GridcannonState } from './logic';

/** Grid coordinates (5×5 including the perimeter) of each royal slot. */
const SLOT_POS = [
  ...[0, 1, 2].map((k) => [0, k + 1]),
  ...[0, 1, 2].map((k) => [k + 1, 4]),
  ...[0, 1, 2].map((k) => [4, k + 1]),
  ...[0, 1, 2].map((k) => [k + 1, 0]),
] as [number, number][];

export default function GridcannonBoard({ state, dispatch }: BoardProps<GridcannonState, GridcannonAction>) {
  const [reserveId, setReserveId] = useResettableState<string | null>(() => null, [state.reserve]);
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  const onCell = (cell: number) => {
    if (reserveId) dispatch({ type: 'reserve', id: reserveId, cell });
    else dispatch({ type: 'place', cell });
  };
  return (
    <div className="layout-split flex flex-col items-center gap-3 [--card-w:clamp(28px,min(10vw,calc((100dvh-200px)/7.2)),78px)] md:flex-row md:justify-center md:gap-10">
      <div className="area-main grid grid-cols-[repeat(5,var(--card-w))] grid-rows-[repeat(5,var(--card-h))] gap-[calc(var(--card-w)*0.08)]">
        {state.royals.map((r, i) => {
          const [row, col] = SLOT_POS[i]!;
          return (
            <div key={`r${i}`} style={{ gridRow: row + 1, gridColumn: col + 1 }} className="relative">
              {r ? (
                <>
                  <Card card={r.dead ? { ...r.card, faceUp: false } : r.card} style={size} dimmed={r.dead} />
                  {!r.dead && (
                    <span className="absolute -bottom-1 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/70 px-1.5 text-[10px] text-cream">
                      {ARMOR[r.card.rank]}
                    </span>
                  )}
                </>
              ) : (
                <div className="pile-slot opacity-40" style={size} />
              )}
            </div>
          );
        })}
        {state.grid.map((stack, i) => {
          const top = stack.at(-1);
          const ok = reserveId ? true : !!state.current && canPlace(state, state.current, i);
          return (
            <button
              key={`g${i}`}
              type="button"
              aria-label={`Square ${i + 1}${top ? '' : ', empty'}`}
              onClick={() => onCell(i)}
              disabled={!ok}
              style={{ ...size, gridRow: Math.floor(i / 3) + 2, gridColumn: (i % 3) + 2 }}
              className={`relative rounded-[calc(var(--card-w)*0.08)] ${ok ? 'cursor-pointer ring-2 ring-gold-bright/60' : ''}`}
            >
              {top ? <Card card={top} style={size} /> : <div className="pile-slot" style={size} />}
              {stack.length > 1 && (
                <span className="absolute -top-1.5 -right-1 z-50 rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
                  {stack.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <Pile
            cards={state.deck}
            label={`Deck, ${state.deck.length} left`}
            onPileClick={() => dispatch({ type: 'draw' })}
            emptyLabel=""
          />
          <Pile cards={state.current ? [state.current] : []} label="Card to place" emptyLabel="" />
          <Button variant="primary" disabled={!!state.current || !state.deck.length} onClick={() => dispatch({ type: 'draw' })}>
            Draw
          </Button>
        </div>
        <Log>{state.log}</Log>
        {state.reserve.length > 0 && (
          <div className="flex flex-col items-center gap-1 text-[11px] text-cream/70">
            <span>{reserveId ? 'Now tap a square' : 'Reserve — tap to use'}</span>
            <Pile
              cards={state.reserve}
              layout="fan-right"
              spread={1.2}
              label="Reserve"
              selectedIds={reserveId ? new Set([reserveId]) : undefined}
              onCardClick={(c) => setReserveId(reserveId === c.id ? null : c.id)}
            />
          </div>
        )}
        <Stat label="Destroyed" value={`${state.royals.filter((r) => r?.dead).length}/12`} />
      </div>
    </div>
  );
}
