import type { BoardProps } from '@/core/types/game';
import { Pile } from '@/ui/pile/Pile';
import { CENTER, kingsUp, type ClockAction, type ClockState } from './logic';

// Polar layout: pile i (rank i+1) sits at (i+1) o'clock; Kings in the middle.
const pos = (i: number) => {
  if (i === CENTER) return { left: '50%', top: '50%' };
  const angle = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + Math.cos(angle) * 42}%`, top: `${50 + Math.sin(angle) * 38}%` };
};

const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export default function ClockBoard({ state, dispatch }: BoardProps<ClockState, ClockAction>) {
  const turn = () => dispatch({ type: 'turn' });
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative aspect-[1.7] w-full max-w-[min(100%,max(calc((100dvh-190px)*1.7),calc(var(--card-floor)*8)))] [--card-w:clamp(28px,min(7.4vw,max(calc((100dvh-190px)/6.4),var(--card-floor))),84px)]"
        role="group"
        aria-label="Clock face"
      >
        {state.piles.map((p, i) => {
          const active = i === state.next;
          return (
            <div key={i} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={pos(i)}>
              <Pile
                cards={p}
                layout="fan-right"
                spread={0.18}
                label={`${LABELS[i]} pile`}
                onPileClick={active ? turn : undefined}
                onCardClick={active ? turn : undefined}
                highlightedIds={
                  active
                    ? new Set(
                        p
                          .filter((c) => !c.faceUp)
                          .slice(-1)
                          .map((c) => c.id),
                      )
                    : undefined
                }
                emptyLabel=""
              />
              <span className={`text-[11px] font-semibold ${active ? 'text-gold-bright' : 'text-cream/50'}`}>{LABELS[i]}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-cream/65">
        Cards turned {state.turned}/52 · Kings up {kingsUp(state)}/4
      </p>
    </div>
  );
}
