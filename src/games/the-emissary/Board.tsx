import type { BoardProps } from '@/core/types/game';
import { SUIT_SYMBOL, type CardId } from '@/core/types/card';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Pile } from '@/ui/pile/Pile';
import { Badge, HandArea, Log, Slot, Stat } from '@/ui/table/TableKit';
import { ALLIES, COURT, YOU, legal, trumpOf, type Ally, type EmissaryAction, type EmissaryState } from './logic';

export default function EmissaryBoard({ state, dispatch }: BoardProps<EmissaryState, EmissaryAction>) {
  const [targeting, setTargeting] = useResettableState<Ally | null>(() => null, [state.hand, state.used]);
  const myTurn =
    state.phase === 'play' &&
    state.trick.length < 2 &&
    (state.trick.length === 0 ? state.leader === YOU : state.leader === COURT);
  const playable = new Set<string>(myTurn ? legal(state, YOU).map((c) => c.id) : []);
  const trump = trumpOf(state);
  const onCard = (id: CardId) => {
    if (targeting) dispatch({ type: 'ally', ally: targeting, id });
    else if (playable.has(id)) dispatch({ type: 'play', by: YOU, id });
  };
  const allyUsable = (a: Ally) =>
    state.phase === 'play' &&
    !state.used.includes(a) &&
    (a === 'edict' ? state.trick.length < 2 : a === 'herald' ? state.trick.length === 0 && state.leader === COURT : true);
  return (
    <div className="layout-table flex flex-col gap-3 [--card-w:clamp(40px,min(11vw,max(calc((100dvh-300px)/2.8),var(--card-floor))),100px)]">
      <div className="area-seats flex flex-wrap items-center justify-center gap-[var(--gap)]">
        {state.rulers.map((k, i) => (
          <Slot
            key={k.id}
            card={k}
            label={`Ruler ${i + 1}`}
            caption={state.results[i] === null ? `${state.demands[i]} tricks` : state.results[i] ? '✓ won' : '✗ lost'}
            highlighted={i === state.round && state.phase !== 'over'}
          />
        ))}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-cream/70">Court</span>
          <Pile cards={state.court} layout="fan-right" spread={0.35} label="Court's hand" emptyLabel="" />
        </div>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Badge>{trump ? `Trump ${SUIT_SYMBOL[trump]}` : 'No trump'}</Badge>
          <Stat label="Won" value={`${state.won[0]}/${state.demands[state.round]}`} />
          <Stat label="Court" value={state.won[1]} />
        </div>
        <Pile cards={state.trick.map((t) => t.card)} layout="fan-right" spread={1.3} label="Current trick" emptyLabel="" />
        <Log>{targeting ? `Choose a card for the ${ALLIES.find((a) => a.id === targeting)!.name}.` : state.log}</Log>
        <div className="flex flex-wrap justify-center gap-1.5">
          {ALLIES.map((a) => (
            <Button
              key={a.id}
              title={a.text}
              disabled={!allyUsable(a.id)}
              className={`min-h-9 px-3 text-xs ${targeting === a.id ? 'ring-2 ring-gold' : ''}`}
              onClick={() =>
                a.id === 'scout' || a.id === 'envoy'
                  ? setTargeting(targeting === a.id ? null : a.id)
                  : dispatch({ type: 'ally', ally: a.id })
              }
            >
              {a.card} {a.name}
            </Button>
          ))}
        </div>
        {state.phase === 'roundOver' && (
          <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
            Next fiefdom
          </Button>
        )}
      </div>
      <HandArea active={myTurn} prompt={myTurn ? 'Your play' : 'Your hand'}>
        <Pile
          cards={state.hand}
          layout="fan-right"
          spread={1.5}
          label="Your hand"
          highlightedIds={targeting ? undefined : playable}
          onCardClick={(c) => onCard(c.id)}
          isCardInteractive={(c) => !!targeting || playable.has(c.id)}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
