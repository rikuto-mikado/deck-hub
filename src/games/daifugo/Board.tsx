import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Seat } from '@/ui/table/Seat';
import { seatName } from '../cpuLevel';
import { HUMAN, PLAYERS, POINTS, TITLES, legalShape, placeOf, type DaifugoAction, type DaifugoState } from './logic';

const SUIT_SYMBOL = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' } as const;

function Badge({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'red' }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${tone === 'red' ? 'bg-[#c8102e] text-white' : 'bg-gold text-ink'}`}
    >
      {children}
    </span>
  );
}

export default function DaifugoBoard({ state, dispatch }: BoardProps<DaifugoState, DaifugoAction>) {
  const name = (p: number) => seatName(state.seats, p);
  // The selection is for this hand and phase; it starts over when either changes.
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.phase]);

  const hand = state.hands[HUMAN]!;
  const giving = state.phase === 'exchange' && state.pendingGive?.from === HUMAN ? state.pendingGive : null;
  const myTurn = state.phase === 'play' && state.turn === HUMAN && hand.length > 0;
  const selection = hand.filter((c) => picked.has(c.id));
  const canPlay = myTurn && selection.length > 0 && !!legalShape(state, selection);
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const title = (p: number) => {
    if (state.phase === 'roundOver' || state.phase === 'matchOver') return TITLES[placeOf(state, p)];
    if (state.finished.includes(p)) return `${['1st', '2nd', '3rd'][state.finished.indexOf(p)]} out`;
    if (state.fallen.includes(p)) return 'Fell';
    if (state.passed[p]) return 'Pass';
    return state.lastPlaces ? `(${TITLES[state.lastPlaces[p]!]})` : undefined;
  };

  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats flex flex-col gap-3 short:gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cream/75">
          <span>
            Round {state.round}/{state.rules.rounds}
          </span>
          <span className="tabular-nums">{state.points.map((pts, p) => `${name(p)} ${pts}`).join(' · ')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: PLAYERS - 1 }, (_, k) => k + 1).map((p) => (
            <Seat
              key={p}
              name={name(p)}
              cards={state.hands[p]!}
              active={state.phase === 'play' && state.turn === p}
              note={title(p)}
            />
          ))}
        </div>
      </div>

      <div className="area-side flex flex-col gap-3 short:gap-2">
        <div className="mid-cards flex min-h-[calc(var(--card-h)+3rem)] flex-col items-center justify-center gap-2 short:min-h-0">
          <div className="flex h-5 gap-1.5">
            {state.revolution && <Badge tone="red">REVOLUTION</Badge>}
            {state.jBack && <Badge>J-BACK</Badge>}
            {state.lock && <Badge>LOCK {state.lock.map((s) => SUIT_SYMBOL[s]).join('')}</Badge>}
          </div>
          <Pile cards={state.table?.cards ?? []} layout="fan-right" spread={1.6} label="Current play" emptyLabel="" />
          <p className="max-w-md text-center text-sm text-cream/85" aria-live="polite">
            {state.log}
          </p>
        </div>

        {state.phase === 'roundOver' && (
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2 rounded-xl bg-black/25 p-3 text-sm short:gap-1 short:p-2">
            {[0, 1, 2, 3].map((place) => {
              const p = state.places!.indexOf(place);
              return (
                <div key={place} className="flex justify-between text-cream/85">
                  <span>{TITLES[place]}</span>
                  <span>
                    {name(p)} <span className="text-cream/55">+{POINTS[place]}</span>
                  </span>
                </div>
              );
            })}
            <Button variant="primary" className="mt-1" onClick={() => dispatch({ type: 'nextRound' })}>
              Next round
            </Button>
          </div>
        )}
      </div>

      <div
        className={`hand-cards area-main flex flex-col items-center gap-2 rounded-xl py-2 ${myTurn || giving ? 'bg-gold/10 ring-1 ring-gold/50' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream/70">
          {giving ? (
            <>
              <span>
                Pick {giving.count} card{giving.count > 1 ? 's' : ''} for {name(giving.to)}
              </span>
              <Button
                variant="primary"
                disabled={picked.size !== giving.count}
                onClick={() => dispatch({ type: 'give', by: HUMAN, ids: [...picked] })}
              >
                Give
              </Button>
            </>
          ) : (
            <>
              <span>
                {myTurn
                  ? state.table
                    ? `Beat the ${state.table.kind === 'stairs' ? 'run' : 'set'} of ${state.table.count} or pass`
                    : 'You lead — play any set or run'
                  : 'Your hand'}
              </span>
              <Button
                variant="primary"
                onClick={() => dispatch({ type: 'play', by: HUMAN, ids: [...picked] })}
                disabled={!canPlay}
              >
                Play
              </Button>
              <Button onClick={() => dispatch({ type: 'pass', by: HUMAN })} disabled={!myTurn || !state.table}>
                Pass
              </Button>
            </>
          )}
        </div>
        <Pile
          cards={hand}
          layout="fan-right"
          spread={hand.length > 10 ? 1.15 : 1.7}
          label="Your hand"
          selectedIds={picked}
          onCardClick={myTurn || giving ? (c) => toggle(c.id) : undefined}
          emptyLabel=""
        />
      </div>
    </div>
  );
}
