import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { SLOTS, canPlay, isOpen, type TriPeaksAction, type TriPeaksState } from './logic';

export default function TriPeaksBoard({ state, dispatch }: BoardProps<TriPeaksState, TriPeaksAction>) {
  return (
    <div style={columnsStyle(10, 104, 3.7)} className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: 'calc(var(--card-w) * 10)', height: 'calc(var(--card-h) * 2.5)' }}>
        {state.peaks.map((card, i) => {
          if (!card) return null;
          const slot = SLOTS[i]!;
          return (
            <Card
              key={card.id}
              card={card}
              disabled={!isOpen(state, i)}
              highlighted={canPlay(state, i)}
              onClick={() => dispatch({ type: 'play', slot: i })}
              style={{
                position: 'absolute',
                width: 'var(--card-w)',
                height: 'var(--card-h)',
                left: `calc(var(--card-w) * ${slot.x})`,
                top: `calc(var(--card-h) * ${slot.row * 0.5})`,
                zIndex: slot.row + 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-start gap-[var(--gap)]">
        <Pile cards={state.stock} label="Stock" onPileClick={() => dispatch({ type: 'draw' })} emptyLabel="—" />
        <Pile cards={state.waste} layout="fan-right" maxFan={3} label="Waste" />
        <div className="ml-2 self-center text-xs leading-5 text-cream/65">
          <div>Stock {state.stock.length}</div>
          <div>Streak {state.streak}</div>
        </div>
      </div>
    </div>
  );
}
