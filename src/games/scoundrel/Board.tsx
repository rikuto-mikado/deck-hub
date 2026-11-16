import type { StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import {
  MAX_HEALTH,
  canAvoid,
  damageFrom,
  kindOf,
  valueOf,
  weaponUsable,
  type ScoundrelAction,
  type ScoundrelState,
} from './logic';

const SMALL = { '--card-w': 'clamp(34px, 11vw, 64px)' } as React.CSSProperties;
const KIND_LABEL = { monster: 'Monster', weapon: 'Weapon', potion: 'Potion' } as const;

export default function ScoundrelBoard({ state, dispatch }: BoardProps<ScoundrelState, ScoundrelAction>) {
  // A monster picked for fighting belongs to this exact state; any move clears it.
  const [choice, setChoice] = useResettableState<StandardCard | null>(() => null, [state]);

  const take = (card: StandardCard) => {
    if (kindOf(card) === 'monster' && weaponUsable(state, card)) setChoice(card);
    else dispatch({ type: 'take', id: card.id });
  };
  const hp = Math.max(0, state.health);

  return (
    <div style={columnsStyle(4, 118, 1.5)} className="layout-split flex flex-col gap-5">
      <div className="area-side flex items-center gap-3">
        <span className="text-sm font-semibold text-cream">HP</span>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={MAX_HEALTH}
          aria-valuenow={hp}
          aria-label="Health"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c8102e] to-[#e2574c] transition-[width] duration-300"
            style={{ width: `${(hp / MAX_HEALTH) * 100}%` }}
          />
        </div>
        <span className="w-12 text-right text-sm text-cream tabular-nums">
          {state.health}/{MAX_HEALTH}
        </span>
      </div>

      <div className="area-side flex items-start justify-between gap-[var(--gap)]" style={SMALL}>
        <div className="flex flex-col items-center gap-1 text-xs text-cream/65">
          <Pile cards={state.dungeon} label="Dungeon" emptyLabel="" />
          Dungeon {state.dungeon.length}
        </div>
        <p className="flex-1 self-center text-center text-sm text-cream/85" aria-live="polite">
          {state.log}
        </p>
        <div className="flex flex-col items-center gap-1 text-xs text-cream/65">
          <Pile cards={state.discard.slice(-2)} label="Discard" emptyLabel="" />
          Discard
        </div>
      </div>

      <div className="area-main flex flex-col gap-4 short:gap-2">
        <div className="grid grid-cols-4 justify-items-center gap-[var(--gap)]">
          {state.room.map((card) => {
            const kind = kindOf(card);
            const hint =
              kind === 'monster'
                ? `-${damageFrom(state, card, false)} HP`
                : kind === 'weapon'
                  ? `Equip ${valueOf(card)}`
                  : state.potionUsed
                    ? 'No effect'
                    : `+${Math.min(MAX_HEALTH - state.health, valueOf(card))} HP`;
            return (
              <div key={card.id} className="flex flex-col items-center gap-1.5">
                <Card
                  card={card}
                  onClick={() => take(card)}
                  selected={choice?.id === card.id}
                  style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}
                />
                <span className="text-[11px] leading-tight text-cream/70">
                  {KIND_LABEL[kind]} · {hint}
                </span>
              </div>
            );
          })}
          {Array.from({ length: 4 - state.room.length }, (_, i) => (
            <div key={`e${i}`} className="pile-slot h-[var(--card-h)] w-[var(--card-w)]" />
          ))}
        </div>

        <div className="flex min-h-11 flex-wrap items-center justify-center gap-2">
          {choice ? (
            <>
              <Button variant="primary" onClick={() => dispatch({ type: 'take', id: choice.id })}>
                Fight with weapon (−{damageFrom(state, choice, false)})
              </Button>
              <Button onClick={() => dispatch({ type: 'take', id: choice.id, barehanded: true })}>
                Barehanded (−{valueOf(choice)})
              </Button>
              <Button onClick={() => setChoice(null)}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => dispatch({ type: 'avoid' })} disabled={!canAvoid(state)}>
              Avoid this room
            </Button>
          )}
        </div>
      </div>

      <div className="area-side flex items-center gap-3" style={SMALL}>
        <span className="text-xs text-cream/65">Weapon</span>
        <Pile
          cards={state.weapon ? [state.weapon, ...state.slain] : []}
          layout="fan-right"
          label="Weapon and slain monsters"
          emptyLabel="—"
        />
        {state.slain.length > 0 && (
          <span className="text-xs text-cream/65">
            Can fight {state.weaponAllowsEqual ? '≤' : '<'} {valueOf(state.slain.at(-1)!)}
          </span>
        )}
      </div>
    </div>
  );
}
