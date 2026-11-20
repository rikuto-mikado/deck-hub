import type { CardId, StandardCard } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Stat } from '@/ui/table/TableKit';
import {
  ABILITY,
  CPU,
  HUMAN,
  canScuttle,
  controller,
  goalOf,
  hasGlasses,
  isOneOff,
  oneOffTargets,
  pointsOf,
  targetsOf,
  type CuttleAction,
  type CuttleState,
} from './logic';

type Mode = 'scuttle' | 'jack' | 'oneoff' | null;

export default function CuttleBoard({ state, dispatch }: BoardProps<CuttleState, CuttleAction>) {
  const [sel, setSel] = useResettableState<CardId | null>(() => null, [state.hands, state.phase, state.revealed]);
  const [mode, setMode] = useResettableState<Mode>(() => null, [sel]);
  const [discards, setDiscards] = useResettableState<Set<CardId>>(() => new Set(), [state.phase]);
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  const main = state.phase === 'main' && state.turn === HUMAN && state.winner === null;
  const seven = state.phase === 'seven' && state.actor === HUMAN;
  const myChoice = state.phase !== 'main' && state.actor === HUMAN && state.winner === null;
  const hand = state.hands[HUMAN];
  const card: StandardCard | null = seven ? state.revealed : (hand.find((c) => c.id === sel) ?? null);
  const targets = new Set<string>(
    !card || !mode
      ? []
      : mode === 'scuttle'
        ? state.points.filter((pc) => controller(pc) === CPU && canScuttle(card, pc)).map((pc) => pc.card.id)
        : mode === 'jack'
          ? targetsOf(state, 'point', CPU)
          : (oneOffTargets(state, HUMAN, card) ?? []),
  );
  const onTarget = (id: CardId) => {
    if (!card || !targets.has(id)) return;
    if (mode === 'scuttle') dispatch({ type: 'scuttle', by: HUMAN, id: card.id, target: id });
    else if (mode === 'jack') dispatch({ type: 'royal', by: HUMAN, id: card.id, target: id });
    else dispatch({ type: 'oneoff', by: HUMAN, id: card.id, target: id });
  };
  const area = (p: number) => (
    <div className="flex flex-wrap items-end justify-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] text-cream/60 short:hidden">Points</span>
        <div className="flex min-h-[var(--card-h)] flex-wrap gap-1">
          {state.points
            .filter((pc) => controller(pc) === p)
            .map((pc) => (
              <div
                key={pc.card.id}
                className="relative"
                style={{ width: `calc(var(--card-w) * ${1 + pc.jacks.length * 0.3})`, height: 'var(--card-h)' }}
              >
                <Card
                  card={pc.card}
                  style={{ ...size, position: 'absolute', left: 0 }}
                  highlighted={targets.has(pc.card.id)}
                  onClick={targets.has(pc.card.id) ? () => onTarget(pc.card.id) : undefined}
                />
                {pc.jacks.map((j, i) => (
                  <Card
                    key={j.card.id}
                    card={j.card}
                    style={{ ...size, position: 'absolute', left: `calc(var(--card-w) * ${0.3 * (i + 1)})` }}
                    highlighted={targets.has(j.card.id)}
                    onClick={targets.has(j.card.id) ? () => onTarget(j.card.id) : undefined}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] text-cream/60 short:hidden">Permanents</span>
        <div className="flex min-h-[var(--card-h)] gap-1">
          {state.perms[p]!.map((c) => (
            <Card
              key={c.id}
              card={c}
              style={size}
              highlighted={targets.has(c.id)}
              onClick={targets.has(c.id) ? () => onTarget(c.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
  const opp = state.hands[CPU].map((c) => (hasGlasses(state, HUMAN) ? { ...c, faceUp: true } : c));
  const pend = state.pending;
  return (
    <div className="layout-table flex flex-col gap-2 [--card-w:clamp(30px,min(7vw,max(calc((100dvh-330px)/4.2),var(--card-floor))),72px)]">
      <div className="area-seats flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <Stat label={state.seat.name} value={`${pointsOf(state, CPU)}/${goalOf(state, CPU)}`} />
          <div className="seat-cards">
            <Pile cards={opp} layout="fan-right" spread={0.8} label={`${state.seat.name}'s hand`} emptyLabel="" />
          </div>
        </div>
        {area(CPU)}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <Pile
            cards={state.deck}
            label={`Deck, ${state.deck.length} left`}
            onPileClick={main ? () => dispatch({ type: 'draw', by: HUMAN }) : undefined}
            emptyLabel=""
          />
          <Pile
            cards={state.scrap}
            layout={state.phase === 'rummage' && state.actor === HUMAN ? 'fan-right' : 'stack'}
            spread={0.5}
            label="Scrap pile"
            onCardClick={
              state.phase === 'rummage' && state.actor === HUMAN
                ? (c) => dispatch({ type: 'rummage', by: HUMAN, id: c.id })
                : undefined
            }
            emptyLabel=""
          />
          {pend && <Pile cards={[pend.card, ...pend.chain]} layout="fan-right" spread={0.6} label="One-off being played" />}
          {state.revealed && <Pile cards={[state.revealed]} label="Revealed card" />}
        </div>
        <Log>{state.log}</Log>
        {card && (main || seven) && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-center text-[11px] text-gold-bright">{ABILITY[card.rank]}</span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {card.rank <= 10 && (
                <>
                  <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'points', by: HUMAN, id: card.id })}>
                    Points
                  </Button>
                  <Button
                    className={`min-h-9 px-3 ${mode === 'scuttle' ? 'ring-2 ring-gold' : ''}`}
                    onClick={() => setMode('scuttle')}
                  >
                    Scuttle…
                  </Button>
                </>
              )}
              {isOneOff(card) && (
                <Button
                  className={`min-h-9 px-3 ${mode === 'oneoff' ? 'ring-2 ring-gold' : ''}`}
                  onClick={() =>
                    oneOffTargets(state, HUMAN, card) ? setMode('oneoff') : dispatch({ type: 'oneoff', by: HUMAN, id: card.id })
                  }
                >
                  One-off{oneOffTargets(state, HUMAN, card) ? '…' : ''}
                </Button>
              )}
              {(card.rank === 8 || card.rank === 12 || card.rank === 13) && (
                <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'royal', by: HUMAN, id: card.id })}>
                  {card.rank === 8 ? 'Glasses' : card.rank === 12 ? 'Queen' : 'King'}
                </Button>
              )}
              {card.rank === 11 && (
                <Button className={`min-h-9 px-3 ${mode === 'jack' ? 'ring-2 ring-gold' : ''}`} onClick={() => setMode('jack')}>
                  Steal…
                </Button>
              )}
            </div>
            {mode && (
              <span className="text-[11px] text-cream/70">{targets.size ? 'Tap a glowing target.' : 'No legal target.'}</span>
            )}
          </div>
        )}
        {myChoice && state.phase === 'counter' && (
          <div className="flex gap-2">
            {hand.some((c) => c.rank === 2) && (
              <Button
                variant="primary"
                onClick={() => dispatch({ type: 'counter', by: HUMAN, id: hand.find((c) => c.rank === 2)!.id })}
              >
                Counter with a 2
              </Button>
            )}
            <Button onClick={() => dispatch({ type: 'resolve', by: HUMAN })}>Let it resolve</Button>
          </div>
        )}
      </div>
      <div className="area-main flex flex-col gap-1">
        {area(HUMAN)}
        <HandArea
          active={main || myChoice}
          prompt={
            <>
              You {pointsOf(state, HUMAN)}/{goalOf(state, HUMAN)} —{' '}
              {state.phase === 'discard' && myChoice
                ? `discard ${Math.min(2, hand.length)} cards`
                : state.phase === 'rummage' && myChoice
                  ? 'pick a card from the scrap pile'
                  : seven
                    ? 'play the revealed card'
                    : main
                      ? 'choose a card, or draw'
                      : 'waiting'}
            </>
          }
          actions={
            <>
              {main && (
                <Button
                  className="min-h-9"
                  disabled={!state.deck.length || hand.length >= 8}
                  onClick={() => dispatch({ type: 'draw', by: HUMAN })}
                >
                  Draw
                </Button>
              )}
              {main && !state.deck.length && (
                <Button className="min-h-9" onClick={() => dispatch({ type: 'pass', by: HUMAN })}>
                  Pass
                </Button>
              )}
              {state.phase === 'discard' && myChoice && (
                <Button
                  variant="primary"
                  className="min-h-9"
                  disabled={discards.size !== Math.min(2, hand.length)}
                  onClick={() => dispatch({ type: 'discard', by: HUMAN, ids: [...discards] })}
                >
                  Discard
                </Button>
              )}
            </>
          }
        >
          <Pile
            cards={hand}
            layout="fan-right"
            spread={1.5}
            label="Your hand"
            selectedIds={state.phase === 'discard' ? discards : sel ? new Set([sel]) : undefined}
            onCardClick={(c) => {
              if (state.phase === 'discard' && myChoice) {
                const n = new Set(discards);
                if (n.has(c.id)) n.delete(c.id);
                else if (n.size < 2) n.add(c.id);
                setDiscards(n);
              } else if (main) setSel(sel === c.id ? null : c.id);
            }}
            emptyLabel=""
          />
        </HandArea>
      </div>
    </div>
  );
}
