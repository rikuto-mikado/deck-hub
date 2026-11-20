import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Slot } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, gridScore, type SixGolfAction, type SixGolfState } from './logic';

function Grid({ state, p, onCell, small }: { state: SixGolfState; p: number; onCell?: (i: number) => void; small?: boolean }) {
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  return (
    <div className={`grid grid-cols-3 gap-[3px] ${small ? 'seat-cards' : ''}`}>
      {state.grids[p]!.map((c, i) => (
        <Card key={c.id} card={c} style={size} onClick={onCell ? () => onCell(i) : undefined} />
      ))}
    </div>
  );
}

export default function SixGolfBoard({ state, dispatch }: BoardProps<SixGolfState, SixGolfAction>) {
  const [reveal, setReveal] = useResettableState<number[]>(() => [], [state.phase, state.hole]);
  const myTurn = state.phase === 'play' && state.turn === HUMAN;
  const onCell = (i: number) => {
    if (state.phase === 'reveal') {
      const next = reveal.includes(i) ? reveal.filter((x) => x !== i) : [...reveal, i].slice(-2);
      if (next.length === 2) dispatch({ type: 'reveal', cells: [next[0]!, next[1]!] });
      else setReveal(next);
    } else if (myTurn && state.mustFlip) dispatch({ type: 'flip', by: HUMAN, cell: i });
    else if (myTurn && state.drawn) dispatch({ type: 'swap', by: HUMAN, cell: i });
  };
  const prompt =
    state.phase === 'reveal'
      ? `Turn up two cards (${reveal.length}/2)`
      : !myTurn
        ? 'Your grid'
        : state.mustFlip
          ? 'Turn up a face-down card'
          : state.drawn
            ? 'Tap a grid card to swap, or discard'
            : 'Draw from the stock or take the discard';
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats flex flex-wrap justify-center gap-3">
        {Array.from({ length: state.players - 1 }, (_, k) => k + 1).map((p) => (
          <div
            key={p}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 ${state.turn === p && state.phase === 'play' ? 'bg-gold/15 ring-1 ring-gold/60' : ''}`}
          >
            <span className="text-xs text-cream">
              {seatName(state.seats, p)} <span className="text-cream/60 tabular-nums">{state.totals[p]}</span>
            </span>
            <Grid state={state} p={p} small />
          </div>
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-3">
          <Pile
            cards={state.stock}
            label="Stock"
            onPileClick={
              myTurn && !state.drawn && !state.mustFlip ? () => dispatch({ type: 'draw', by: HUMAN, from: 'stock' }) : undefined
            }
            emptyLabel=""
          />
          <Pile
            cards={state.discard}
            label="Discard"
            onCardClick={
              myTurn && !state.drawn && !state.mustFlip ? () => dispatch({ type: 'draw', by: HUMAN, from: 'discard' }) : undefined
            }
            isCardInteractive={(_, i) => i === state.discard.length - 1}
            emptyLabel=""
          />
          <Slot card={state.drawn} label="Drawn card" caption="in hand" />
        </div>
        <Log>{state.log}</Log>
        {state.phase === 'holeOver' && (
          <div className="flex flex-col items-center gap-2 text-xs text-cream/80">
            <span>{state.lastHole?.map((x, p) => `${seatName(state.seats, p)} ${x}`).join(' · ')}</span>
            <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
              Next hole
            </Button>
          </div>
        )}
      </div>
      <HandArea
        active={myTurn || state.phase === 'reveal'}
        prompt={
          <>
            Hole {state.hole}/{state.holes} · you {state.totals[HUMAN]} (showing {gridScore(state.grids[HUMAN]!, false)}) —{' '}
            {prompt}
          </>
        }
        actions={
          myTurn &&
          state.drawn &&
          !state.fromDiscard && <Button onClick={() => dispatch({ type: 'toss', by: HUMAN })}>Discard</Button>
        }
      >
        <Grid state={state} p={HUMAN} onCell={onCell} />
      </HandArea>
    </div>
  );
}
