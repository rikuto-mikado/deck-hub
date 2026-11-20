import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Stat } from '@/ui/table/TableKit';
import { ATK, boss, bossAtk, bossHp, isValidAttack, valueOf, type RegicideAction, type RegicideState } from './logic';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 w-40 overflow-hidden rounded-full bg-black/40">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }}
      />
    </div>
  );
}

export default function RegicideBoard({ state, dispatch }: BoardProps<RegicideState, RegicideAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hand, state.phase]);
  const b = boss(state);
  const selection = state.hand.filter((c) => picked.has(c.id));
  const total = selection.reduce((n, c) => n + valueOf(c), 0);
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const defending = state.phase === 'defend';
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(40px,min(11vw,max(calc((100dvh-300px)/2.9),var(--card-floor))),100px)]">
      <div className="area-seats flex flex-wrap items-center justify-center gap-[calc(var(--gap)*2)]">
        <Pile cards={state.castle} label={`Castle, ${state.castle.length} royals left`} emptyLabel="" />
        <div className="flex flex-col gap-1.5 text-xs text-cream/80">
          <span>
            HP {Math.max(0, bossHp(state) - state.damage)}/{bossHp(state)}
          </span>
          <Bar value={bossHp(state) - state.damage} max={bossHp(state) || 1} color="#c8402f" />
          <span>
            Attack {bossAtk(state)} {state.shield > 0 && <span className="text-cream/60">(♠ shield {state.shield})</span>}
          </span>
          <Bar value={bossAtk(state)} max={b ? ATK[b.rank]! : 1} color="#c9a45c" />
        </div>
        <Pile cards={state.played} layout="fan-right" spread={0.5} label="Played against this royal" emptyLabel="" />
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <Log>{state.log}</Log>
        <div className="flex flex-wrap justify-center gap-3">
          <Stat label="Tavern" value={state.tavern.length} />
          <Stat label="Discard" value={state.discard.length} />
          <Stat label="Jesters" value={state.jesters} />
          <Stat label="Defeated" value={`${state.defeated}/12`} />
        </div>
      </div>
      <HandArea
        active
        prompt={
          defending ? `Discard at least ${bossAtk(state)} (selected ${total})` : `Attack with a card or combo (selected ${total})`
        }
        actions={
          <>
            {defending ? (
              <Button
                variant="primary"
                disabled={total < bossAtk(state)}
                onClick={() => dispatch({ type: 'defend', ids: [...picked] })}
              >
                Discard
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  disabled={!selection.length || !isValidAttack(selection)}
                  onClick={() => dispatch({ type: 'attack', ids: [...picked] })}
                >
                  Attack
                </Button>
                <Button onClick={() => dispatch({ type: 'yield' })}>Yield</Button>
              </>
            )}
            <Button disabled={!state.jesters} onClick={() => dispatch({ type: 'jester' })}>
              Jester ({state.jesters})
            </Button>
          </>
        }
      >
        <Pile
          cards={state.hand}
          layout="fan-right"
          spread={1.6}
          label="Your hand"
          selectedIds={picked}
          onCardClick={(c) => toggle(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
