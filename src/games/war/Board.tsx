import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { Badge, Log, Stat } from '@/ui/table/TableKit';
import { CPU, HUMAN, SHORT_ROUNDS, cardsOf, type WarAction, type WarState } from './logic';

export default function WarBoard({ state, dispatch }: BoardProps<WarState, WarAction>) {
  const canFlip = state.phase !== 'collect';
  const flip = () => canFlip && dispatch({ type: 'flip' });
  const row = (p: number, name: string) => (
    <div className="flex items-center justify-center gap-[calc(var(--gap)*2)]">
      <div className="flex w-20 flex-col items-center gap-1 text-xs text-cream/75">
        <span className="font-semibold text-cream">{name}</span>
        <span className="tabular-nums">{cardsOf(state, p)} cards</span>
      </div>
      <Pile
        cards={state.stacks[p]!}
        label={`${name} stack`}
        emptyLabel=""
        onPileClick={p === HUMAN && canFlip ? flip : undefined}
      />
      <Pile cards={state.table[p]!} layout="fan-right" spread={0.9} label={`${name} battle`} emptyLabel="" />
    </div>
  );
  return (
    <div style={columnsStyle(7, 118, 3.2)} className="flex flex-col items-center gap-4 short:gap-2">
      {row(CPU, state.seat.name)}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {state.phase === 'war' && <Badge tone="red">WAR!</Badge>}
        <Log>{state.log}</Log>
        <Button variant="primary" className="min-w-28" onClick={flip} disabled={!canFlip}>
          {state.phase === 'war' ? 'Go to war' : 'Flip'}
        </Button>
        <Stat label="Battle" value={state.mode === 'short' ? `${state.rounds}/${SHORT_ROUNDS}` : state.rounds} />
      </div>
      {row(HUMAN, 'You')}
    </div>
  );
}
