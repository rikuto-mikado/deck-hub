import type { CardId, StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { ROWS, available, indexOf, passesLeft, type PyramidAction, type PyramidState } from './logic';

const size = { width: 'var(--card-w)', height: 'var(--card-h)' };

export default function PyramidBoard({ state, dispatch }: BoardProps<PyramidState, PyramidAction>) {
  const [selected, setSelected] = useResettableState<StandardCard | null>(() => null, [state]);
  const avail = new Set(available(state).map((c) => c.id));

  const pick = (card: StandardCard) => {
    if (!avail.has(card.id)) return;
    if (card.rank === 13) return dispatch({ type: 'remove', ids: [card.id] });
    if (!selected) return setSelected(card);
    if (selected.id === card.id) return setSelected(null);
    if (selected.rank + card.rank === 13) dispatch({ type: 'remove', ids: [selected.id, card.id] as CardId[] });
    else setSelected(card);
  };

  const wasteTop = state.waste.at(-1);
  return (
    <div style={columnsStyle(7, 108, 4.1)} className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center">
        {Array.from({ length: ROWS }, (_, r) => (
          <div
            key={r}
            className="relative flex gap-[calc(var(--card-w)*0.08)]"
            style={{ marginTop: r ? 'calc(var(--card-h) * -0.62)' : 0, zIndex: r }}
          >
            {Array.from({ length: r + 1 }, (_slot, c) => {
              const card = state.pyramid[indexOf(r, c)];
              return card ? (
                <Card
                  key={card.id}
                  card={card}
                  style={size}
                  selected={selected?.id === card.id}
                  disabled={!avail.has(card.id)}
                  dimmed={!avail.has(card.id)}
                  onClick={() => pick(card)}
                />
              ) : (
                <div key={c} style={size} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex w-full items-start justify-center gap-[var(--gap)]">
        <Pile
          cards={state.stock}
          label="Stock"
          onPileClick={() => dispatch(state.stock.length ? { type: 'draw' } : { type: 'recycle' })}
          emptyLabel={passesLeft(state) > 0 && state.waste.length ? '↻' : '—'}
        />
        <Pile
          cards={state.waste}
          label="Waste"
          maxFan={1}
          onCardClick={(c) => pick(c as StandardCard)}
          isCardInteractive={(_, i) => i === state.waste.length - 1}
          selectedIds={selected && selected.id === wasteTop?.id ? new Set([selected.id]) : undefined}
        />
        <div className="ml-2 self-center text-xs leading-5 text-cream/65">
          <div>Stock {state.stock.length}</div>
          <div>Redeals left {passesLeft(state) === Infinity ? '∞' : passesLeft(state)}</div>
        </div>
      </div>
    </div>
  );
}
