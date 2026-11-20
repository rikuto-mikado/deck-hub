import { SUIT_SYMBOL } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { Badge, HandArea, Log } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { HUMAN, actor, beats, canAttack, type DurakAction, type DurakState } from './logic';

export default function DurakBoard({ state, dispatch }: BoardProps<DurakState, DurakAction>) {
  const me = actor(state) === HUMAN;
  const defending = me && state.phase === 'defend';
  const open = state.table.find((p) => !p.defense);
  const hand = state.hands[HUMAN]!;
  const ok = new Set<string>(
    !me
      ? []
      : defending
        ? hand.filter((c) => open && beats(open.attack, c, state.trump)).map((c) => c.id)
        : hand.filter((c) => canAttack(state, c)).map((c) => c.id),
  );
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  const role = (p: number) =>
    p === state.attacker ? 'Attacker' : p === state.defender ? 'Defender' : state.out.includes(p) ? 'Out' : undefined;
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: state.players - 1 }, (_, k) => k + 1).map((p) => (
          <Seat key={p} name={seatName(state.seats, p)} cards={state.hands[p]!} active={actor(state) === p} note={role(p)} />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Pile cards={state.stock} layout="stack" label={`Stock, ${state.stock.length} left`} emptyLabel="" />
            <Badge>Trump {SUIT_SYMBOL[state.trump]}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.table.map((p) => (
              <div
                key={p.attack.id}
                className="relative"
                style={{ width: 'calc(var(--card-w) * 1.25)', height: 'calc(var(--card-h) * 1.18)' }}
              >
                <Card card={p.attack} style={{ ...size, position: 'absolute', left: 0, top: 0 }} />
                {p.defense && (
                  <Card
                    card={p.defense}
                    style={{
                      ...size,
                      position: 'absolute',
                      left: 'calc(var(--card-w) * 0.25)',
                      top: 'calc(var(--card-h) * 0.18)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <Log>{state.log}</Log>
      </div>
      <HandArea
        active={me}
        prompt={
          me
            ? defending
              ? 'Beat the attack, or take the cards'
              : state.table.length
                ? 'Throw in a matching rank, or pass'
                : 'Attack with any card'
            : `You: ${role(HUMAN) ?? 'waiting'}`
        }
        actions={
          me &&
          (defending ? (
            <Button onClick={() => dispatch({ type: 'take', by: HUMAN })}>Take</Button>
          ) : (
            state.table.length > 0 && <Button onClick={() => dispatch({ type: 'pass', by: HUMAN })}>Pass</Button>
          ))
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={hand.length > 10 ? 1.1 : 1.6}
          label="Your hand"
          highlightedIds={ok}
          onCardClick={(c) =>
            ok.has(c.id) &&
            dispatch(defending ? { type: 'defend', by: HUMAN, id: c.id } : { type: 'attack', by: HUMAN, id: c.id })
          }
          isCardInteractive={(c) => ok.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
