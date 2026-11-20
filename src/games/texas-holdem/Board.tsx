import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { Pile } from '@/ui/pile/Pile';
import { HandArea, Log, Stat } from '@/ui/table/TableKit';
import { seatName } from '../cpuLevel';
import { BIG_BLIND, HUMAN, pot, toCall, type HoldemAction, type HoldemState } from './logic';

export default function HoldemBoard({ state, dispatch }: BoardProps<HoldemState, HoldemAction>) {
  const myTurn = state.turn === HUMAN;
  const owe = toCall(state, HUMAN);
  const stack = state.stacks[HUMAN]!;
  const maxTo = state.bets[HUMAN]! + stack;
  const raiseTo = (frac: number) =>
    Math.min(maxTo, state.currentBet + Math.max(state.minRaise, Math.round((pot(state) * frac) / 10) * 10));
  const minTo = Math.min(maxTo, state.currentBet + state.minRaise);
  const canRaise = myTurn && stack > owe;
  const word = state.currentBet === 0 ? 'Bet' : 'Raise';
  const note = (p: number) => {
    if (!state.hole[p]!.length) return 'Busted';
    if (state.folded[p]) return 'Folded';
    if (state.stacks[p] === 0) return 'All in';
    return state.bets[p] ? `Bet ${state.bets[p]}` : p === state.dealer ? 'Dealer' : '';
  };
  return (
    <div className="layout-table flex flex-col gap-3">
      <div className="area-seats flex flex-wrap justify-center gap-3">
        {Array.from({ length: state.players - 1 }, (_, k) => k + 1).map((p) => (
          <div
            key={p}
            className={`seat-cards flex flex-col items-center gap-1 rounded-xl px-2 py-1 ${state.turn === p ? 'bg-gold/15 ring-1 ring-gold/60' : ''} ${state.folded[p] ? 'opacity-50' : ''}`}
          >
            <span className="text-xs text-cream">
              {seatName(state.seats, p)} <span className="text-cream/65 tabular-nums">{state.stacks[p]}</span>
            </span>
            <Pile
              cards={state.hole[p]!}
              layout="fan-right"
              spread={1.1}
              label={`${seatName(state.seats, p)}'s cards`}
              emptyLabel=""
            />
            <span className="h-4 text-[11px] text-gold/90">{note(p)}</span>
          </div>
        ))}
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex flex-col items-center gap-1">
          <Pile cards={state.board} layout="fan-right" spread={1.12} label="Board" emptyLabel="" />
          <div className="flex gap-3">
            <Stat label="Pot" value={pot(state)} />
            <Stat label="Blinds" value={`${BIG_BLIND / 2}/${BIG_BLIND}`} />
          </div>
        </div>
        <Log>{state.log}</Log>
        {state.phase === 'handOver' && (
          <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
            Next hand
          </Button>
        )}
      </div>
      <HandArea
        active={myTurn}
        prompt={
          <>
            Stack {stack}
            {state.bets[HUMAN] ? ` · bet ${state.bets[HUMAN]}` : ''} · {note(HUMAN) || (myTurn ? 'your move' : 'waiting')}
          </>
        }
        actions={
          myTurn && (
            <div className="flex flex-wrap justify-center gap-1.5">
              <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'fold', by: HUMAN })}>
                Fold
              </Button>
              {owe > 0 ? (
                <Button variant="primary" className="min-h-9 px-3" onClick={() => dispatch({ type: 'call', by: HUMAN })}>
                  Call {owe}
                </Button>
              ) : (
                <Button variant="primary" className="min-h-9 px-3" onClick={() => dispatch({ type: 'check', by: HUMAN })}>
                  Check
                </Button>
              )}
              {canRaise && (
                <>
                  <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'raise', by: HUMAN, to: minTo })}>
                    {word} {minTo}
                  </Button>
                  {raiseTo(0.5) > minTo && raiseTo(0.5) < maxTo && (
                    <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'raise', by: HUMAN, to: raiseTo(0.5) })}>
                      ½ pot
                    </Button>
                  )}
                  {raiseTo(1) > raiseTo(0.5) && raiseTo(1) < maxTo && (
                    <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'raise', by: HUMAN, to: raiseTo(1) })}>
                      Pot
                    </Button>
                  )}
                  <Button className="min-h-9 px-3" onClick={() => dispatch({ type: 'raise', by: HUMAN, to: maxTo })}>
                    All in
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        <Pile cards={state.hole[HUMAN]!} layout="fan-right" spread={1.15} label="Your cards" emptyLabel="" />
      </HandArea>
    </div>
  );
}
