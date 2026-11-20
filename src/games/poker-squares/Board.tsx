import { HAND_NAME } from '@/core/rules/pokerHands';
import type { BoardProps } from '@/core/types/game';
import { Card } from '@/ui/card/Card';
import { Pile } from '@/ui/pile/Pile';
import { columnsStyle } from '@/ui/table/Table';
import { Stat } from '@/ui/table/TableKit';
import { GOAL, LINES, current, lineScore, totalScore, type PokerSquaresAction, type PokerSquaresState } from './logic';

function Score({ s, line, className = '' }: { s: PokerSquaresState; line: readonly number[]; className?: string }) {
  const r = lineScore(s, line);
  return (
    <div
      className={`grid place-items-center text-[11px] leading-tight tabular-nums ${r?.points ? 'text-gold-bright' : 'text-cream/45'} ${className}`}
      title={r ? HAND_NAME[r.category] : undefined}
    >
      {r ? r.points : '·'}
    </div>
  );
}

export default function PokerSquaresBoard({ state, dispatch }: BoardProps<PokerSquaresState, PokerSquaresAction>) {
  const card = current(state);
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  return (
    <div
      style={columnsStyle(8, 96, 6.4)}
      className="layout-split flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-10"
    >
      <div className="area-main grid grid-cols-[repeat(5,var(--card-w))_2rem] gap-[3px] [--card-w:clamp(28px,min(calc((min(100vw,1280px)-180px)/8),calc((100dvh-230px)/7.6)),96px)]">
        <Score s={state} line={LINES[11]!} className="col-start-6 row-start-1 -rotate-45 opacity-80" />
        {Array.from({ length: 5 }, (_, r) => (
          <div key={r} className="contents">
            {Array.from({ length: 5 }, (_cell, c) => {
              const i = r * 5 + c;
              const placed = state.grid[i];
              return placed ? (
                <Card key={placed.id} card={placed} style={{ ...size, gridRow: r + 2, gridColumn: c + 1 }} />
              ) : (
                <button
                  key={`e${i}`}
                  type="button"
                  aria-label={`Place in row ${r + 1}, column ${c + 1}`}
                  disabled={!card}
                  onClick={() => dispatch({ type: 'place', cell: i })}
                  className="pile-slot cursor-pointer hover:border-gold-bright/80 hover:bg-gold/10"
                  style={{ ...size, gridRow: r + 2, gridColumn: c + 1 }}
                />
              );
            })}
            <Score s={state} line={LINES[r]!} className="col-start-6" />
          </div>
        ))}
        {Array.from({ length: 5 }, (_, c) => (
          <Score key={c} s={state} line={LINES[5 + c]!} className="row-start-7 h-5" />
        ))}
        <Score s={state} line={LINES[10]!} className="col-start-6 row-start-7 h-5 rotate-45 opacity-80" />
      </div>
      <div className="area-side flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Pile cards={state.deck} label="Next card" emptyLabel="" />
          <div className="flex flex-col gap-1">
            <Stat label="Score" value={totalScore(state)} />
            <Stat label="Goal" value={GOAL[state.scoring]} />
            <Stat label="Cards left" value={state.deck.length} />
          </div>
        </div>
        <p className="max-w-60 text-center text-xs text-cream/65">
          {card ? 'Tap an empty square to place the card. Rows, columns and both diagonals score.' : 'Grid complete.'}
        </p>
      </div>
    </div>
  );
}
