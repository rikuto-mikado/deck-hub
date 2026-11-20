import type { BoardProps } from '@/core/types/game';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { cardFrom, targetRow, type OsmosisAction, type OsmosisState } from './logic';

export default function OsmosisBoard({ state, dispatch }: BoardProps<OsmosisState, OsmosisAction>) {
  const play = (from: string) => {
    const card = cardFrom(state, from);
    const row = card ? targetRow(state, card) : -1;
    if (row >= 0) dispatch({ type: 'play', from, row });
  };
  const playable = new Set(
    ['r0', 'r1', 'r2', 'r3', 'waste'].flatMap((f) => {
      const c = cardFrom(state, f);
      return c && targetRow(state, c) >= 0 ? [c.id] : [];
    }),
  );
  return (
    <div style={columnsStyle(11, 96, 4.5)} className="flex items-start justify-center gap-[calc(var(--gap)*2)]">
      <div className="flex flex-col gap-[calc(var(--card-w)*0.12)]">
        {state.reserves.map((r, i) => (
          <Pile
            key={i}
            cards={r}
            layout="fan-right"
            spread={0.25}
            label={`Reserve ${i + 1}`}
            onCardClick={() => play(`r${i}`)}
            isCardInteractive={(_, idx) => idx === r.length - 1}
            highlightedIds={playable}
            emptyLabel=""
          />
        ))}
      </div>
      <div className="flex flex-col gap-[calc(var(--card-w)*0.12)]">
        {state.rows.map((r, i) => (
          <Pile key={i} cards={r} layout="fan-right" spread={0.55} label={`Foundation row ${i + 1}`} emptyLabel="" />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <Pile
          cards={state.stock}
          label="Stock"
          onPileClick={() => dispatch({ type: 'draw' })}
          emptyLabel={state.waste.length ? '↻' : ''}
        />
        <Pile
          cards={state.waste}
          layout="fan-down"
          maxFan={3}
          label="Waste"
          onCardClick={() => play('waste')}
          isCardInteractive={(_, i) => i === state.waste.length - 1}
          highlightedIds={playable}
        />
      </div>
    </div>
  );
}
