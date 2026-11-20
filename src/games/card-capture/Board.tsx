import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Slot, Stat } from '@/ui/table/TableKit';
import { canBanish, canCapture, enemyValue, type CaptureAction, type CaptureState } from './logic';

export default function CardCaptureBoard({ state, dispatch }: BoardProps<CaptureState, CaptureAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hand]);
  const [target, setTarget] = useResettableState<number | null>(() => null, [state.dungeon]);
  const cards = state.hand.filter((c) => picked.has(c.id));
  const enemy = target !== null ? state.dungeon[target] : null;
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(40px,min(12vw,max(calc((100dvh-290px)/2.9),var(--card-floor))),104px)]">
      <div className="area-seats flex flex-wrap items-end justify-center gap-[var(--gap)]">
        <Pile cards={state.enemies} label={`Enemy deck, ${state.enemies.length} left`} emptyLabel="" />
        {state.dungeon.map((d, i) => (
          <Slot
            key={i}
            card={d}
            label={`Dungeon ${i + 1}`}
            caption={d ? `needs ${enemyValue(d)}` : '—'}
            selected={target === i}
            onClick={d ? () => setTarget(target === i ? null : i) : undefined}
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <Log>{state.log}</Log>
        <div className="flex flex-wrap justify-center gap-3">
          <Stat label="Torches" value={'🔥'.repeat(Math.max(0, state.torches)) || '0'} />
          <Stat label="Royals" value={`${state.royals}/12`} />
          <Stat label="Deck" value={state.deck.length} />
          <Stat label="Discard" value={state.discard.length} />
        </div>
      </div>
      <HandArea
        active
        prompt={enemy ? 'Pick cards of its suit, or one A–3 to banish it' : 'Tap an enemy, then your cards'}
        actions={
          <>
            <Button
              variant="primary"
              disabled={!enemy || !canCapture(enemy, cards)}
              onClick={() => dispatch({ type: 'capture', target: target!, ids: [...picked] })}
            >
              Capture
            </Button>
            <Button
              disabled={!enemy || cards.length !== 1 || !canBanish(cards[0]!)}
              onClick={() => dispatch({ type: 'banish', target: target!, id: cards[0]!.id })}
            >
              Banish
            </Button>
            <Button onClick={() => dispatch({ type: 'end' })}>End turn</Button>
          </>
        }
      >
        <Pile
          cards={state.hand}
          layout="fan-right"
          spread={2}
          label="Your hand"
          selectedIds={picked}
          onCardClick={(c) => toggle(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
