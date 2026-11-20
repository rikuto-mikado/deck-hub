import type { BoardProps } from '@/core/types/game';
import { DragProvider } from '@/ui/dnd/DragContext';
import { Pile } from '@/ui/pile/Pile';
import { canMove, targetsOf, type AccordionAction, type AccordionState } from './logic';

export default function AccordionBoard({ state, dispatch }: BoardProps<AccordionState, AccordionAction>) {
  const onDrop = (from: { pileId: string }, to: string) => {
    const f = Number(from.pileId.slice(1)),
      t = Number(to.slice(1));
    if (!canMove(state, f, t)) return false;
    dispatch({ type: 'move', from: f, to: t });
    return true;
  };
  const targets = new Set(state.selected !== null ? targetsOf(state, state.selected) : []);
  return (
    <DragProvider onDrop={onDrop}>
      <div className="flex flex-col items-center gap-2 [--card-w:clamp(26px,min(calc((min(100vw,1280px)-120px)/13.6),max(calc((100dvh-210px)/6.2),var(--card-floor))),80px)]">
        <div className="grid grid-cols-[repeat(13,var(--card-w))] gap-x-[3px] gap-y-[calc(var(--card-w)*0.12)]">
          {state.piles.map((p, i) => {
            const top = p.at(-1)!;
            return (
              <div key={p[0]!.id} className="relative">
                <Pile
                  id={`p${i}`}
                  cards={p}
                  label={`Pile ${i + 1} (${p.length})`}
                  onCardClick={() => dispatch({ type: 'select', pile: i })}
                  isCardInteractive={(_, idx) => idx === p.length - 1}
                  canDrag={(_, idx) => idx === p.length - 1 && targetsOf(state, i).length > 0}
                  selectedIds={state.selected === i ? new Set([top.id]) : undefined}
                  highlightedIds={targets.has(i) ? new Set([top.id]) : undefined}
                />
                {p.length > 1 && (
                  <span className="absolute -top-1.5 -right-1 z-[60] rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
                    {p.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-cream/65">{state.piles.length} piles · move a pile onto the one 1 or 3 places to its left</p>
      </div>
    </DragProvider>
  );
}
