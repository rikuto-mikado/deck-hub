import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { CPU, HUMAN, canPlay, type SpeedAction, type SpeedState } from './logic';

export default function SpeedBoard({ state, dispatch }: BoardProps<SpeedState, SpeedAction>) {
  const tap = (slot: number) => {
    const pile = [0, 1].find((p) => canPlay(state, HUMAN, slot, p));
    if (pile !== undefined) dispatch({ type: 'play', by: HUMAN, slot, pile });
  };
  const onDrop = (from: { pileId: string }, to: string) => {
    const slot = Number(from.pileId.slice(1)),
      pile = Number(to.slice(1));
    if (to[0] !== 'p' || !canPlay(state, HUMAN, slot, pile)) return false;
    dispatch({ type: 'play', by: HUMAN, slot, pile });
    return true;
  };
  const playable = (slot: number) => canPlay(state, HUMAN, slot, 0) || canPlay(state, HUMAN, slot, 1);

  return (
    <DragProvider onDrop={onDrop}>
      <div style={columnsStyle(5, 100, 4.3)} className="flex flex-col items-center gap-5 short:gap-2">
        <div className="flex items-center gap-[var(--gap)]">
          <Pile cards={state.stocks[CPU]} label="CPU stock" emptyLabel="" />
          {state.fields[CPU].map((c, i) => (
            <Pile key={i} cards={c ? [c] : []} label={`CPU field ${i + 1}`} emptyLabel="" />
          ))}
        </div>
        <div className="flex items-center gap-[calc(var(--gap)*3)]">
          {[0, 1].map((p) => (
            <Pile key={p} id={`p${p}`} cards={state.center[p as 0 | 1]} label={`Center pile ${p + 1}`} />
          ))}
        </div>
        <p className="h-6 font-display text-lg text-gold" aria-live="polite">
          {state.log}
        </p>
        <div className="flex items-center gap-[var(--gap)]">
          {state.fields[HUMAN].map((c, i) => (
            <Pile
              key={i}
              id={`h${i}`}
              cards={c ? [c] : []}
              label={`Your field ${i + 1}`}
              emptyLabel=""
              highlightedIds={c && playable(i) ? new Set([c.id]) : undefined}
              onCardClick={() => tap(i)}
              canDrag={() => true}
            />
          ))}
          <Pile cards={state.stocks[HUMAN]} label="Your stock" emptyLabel="" />
        </div>
        <div className="flex w-full justify-between text-xs text-cream/65 tabular-nums">
          <span>You: {state.stocks[HUMAN].length + state.fields[HUMAN].filter(Boolean).length} left</span>
          <span>CPU: {state.stocks[CPU].length + state.fields[CPU].filter(Boolean).length} left</span>
        </div>
      </div>
    </DragProvider>
  );
}
