import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { HandArea, Log } from '@/ui/table/TableKit';
import type { CardId } from '@/core/types/card';
import { seatName } from '../cpuLevel';
import { HUMAN, LIMIT, PLAYERS, apply, choicesFor, playable, type NinetyNineAction, type NinetyNineState } from './logic';

export default function NinetyNineBoard({ state, dispatch }: BoardProps<NinetyNineState, NinetyNineAction>) {
  const [choosing, setChoosing] = useResettableState<CardId | null>(() => null, [state.hands, state.turn]);
  const myTurn = state.turn === HUMAN && state.busted === null;
  const hand = state.hands[HUMAN]!;
  const ok = new Set<string>(myTurn ? hand.filter((c) => playable(state, c)).map((c) => c.id) : []);
  const lives = (p: number) => '♥'.repeat(state.lives[p]!) || 'out';
  const pickCard = (id: CardId) => {
    const card = hand.find((c) => c.id === id)!;
    const options = choicesFor(card).filter((ch) => apply(state.total, card, ch) !== null);
    if (options.length === 1) dispatch({ type: 'play', by: HUMAN, id, choice: options[0]! });
    else setChoosing(id);
  };
  const chosen = choosing ? hand.find((c) => c.id === choosing) : null;
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats grid grid-cols-3 gap-2">
        {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
          <Seat
            key={p}
            name={seatName(state.seats, p)}
            cards={state.hands[p]!}
            active={state.turn === p && state.busted === null}
            note={lives(p)}
          />
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-4">
          <Pile cards={state.stock} label="Stock" emptyLabel="" />
          <Pile cards={state.pile} label="Played cards" emptyLabel="" />
          <div className="flex flex-col items-center">
            <span
              className={`font-display text-5xl font-semibold tabular-nums ${state.total >= 90 ? 'text-[#e0624f]' : 'text-heading'}`}
            >
              {state.total}
            </span>
            <span className="text-[11px] text-cream/60">
              of {LIMIT} · {state.dir === 1 ? '↻' : '↺'}
            </span>
          </div>
        </div>
        <Log>{state.log}</Log>
        {chosen && (
          <div className="flex gap-2">
            {choicesFor(chosen).map((ch) => (
              <Button
                key={ch}
                variant="primary"
                disabled={apply(state.total, chosen, ch) === null}
                onClick={() => dispatch({ type: 'play', by: HUMAN, id: chosen.id, choice: ch })}
              >
                {chosen.rank === 1 ? (ch === 'low' ? '+1' : '+11') : ch === 'low' ? '−10' : '+10'}
              </Button>
            ))}
          </div>
        )}
      </div>
      <HandArea
        active={myTurn}
        prompt={
          <>
            Lives {lives(HUMAN)} · {myTurn ? 'play a card' : 'your hand'}
          </>
        }
      >
        <Pile
          cards={hand}
          layout="fan-right"
          spread={1.8}
          label="Your hand"
          highlightedIds={ok}
          selectedIds={choosing ? new Set([choosing]) : undefined}
          onCardClick={(c) => ok.has(c.id) && pickCard(c.id)}
          isCardInteractive={(c) => ok.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
