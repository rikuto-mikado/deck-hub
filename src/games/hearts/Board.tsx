import type { CardId } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Badge } from '@/ui/table/TableKit';
import { TrickTable } from '@/ui/table/TrickTable';
import { seatName } from '../cpuLevel';
import { HUMAN, legal, passDir, toAct, type HeartsAction, type HeartsState } from './logic';

export default function HeartsBoard({ state, dispatch }: BoardProps<HeartsState, HeartsAction>) {
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.phase]);
  const names = [0, 1, 2, 3].map((p) => seatName(state.seats, p));
  const myTurn = toAct(state) === HUMAN;
  const passing = state.phase === 'pass';
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  const onCard = (id: CardId) => {
    if (passing)
      setPicked((p) => {
        const n = new Set(p);
        if (n.has(id)) n.delete(id);
        else if (n.size < 3) n.add(id);
        return n;
      });
    else if (playable.has(id)) dispatch({ type: 'play', by: HUMAN, id });
  };
  return (
    <TrickTable
      names={names}
      hands={state.hands}
      turn={passing ? 0 : toAct(state)}
      trick={state.trick}
      notes={state.taken.map((t, p) => `${state.scores[p]} pts${t ? ` · +${t}` : ''}`)}
      header={
        <>
          <Badge tone="dim">Hand {state.handNo}</Badge>
          {state.broken && <Badge tone="red">♥ broken</Badge>}
          <span className="tabular-nums">
            You {state.scores[HUMAN]} pts{state.taken[HUMAN] ? ` (+${state.taken[HUMAN]})` : ''} · to {state.target}
          </span>
        </>
      }
      log={state.log}
      controls={
        state.phase === 'handOver' && (
          <div className="flex flex-col items-center gap-2 text-xs text-cream/80">
            <span>{state.lastHand?.map((d, p) => `${names[p]} +${d}`).join(' · ')}</span>
            <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
              Next hand
            </Button>
          </div>
        )
      }
      prompt={passing ? `Pass three cards ${passDir(state)} (${picked.size}/3)` : myTurn ? 'Your play' : 'Your hand'}
      handActions={
        passing && (
          <Button variant="primary" disabled={picked.size !== 3} onClick={() => dispatch({ type: 'pass', ids: [...picked] })}>
            Pass
          </Button>
        )
      }
      playable={passing ? undefined : playable}
      selected={picked}
      onCardClick={(c) => onCard(c.id)}
      isCardInteractive={(c) => passing || playable.has(c.id)}
    />
  );
}
