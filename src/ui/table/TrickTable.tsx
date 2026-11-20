import type { ReactNode } from 'react';
import type { Card as CardModel } from '@/core/types/card';
import { Card } from '../card/Card';
import { Pile } from '../pile/Pile';
import { Seat } from './Seat';
import { HandArea, Log } from './TableKit';

export interface TrickTableProps {
  /** Seat names, seat 0 being the human (South); 1 West, 2 North, 3 East. */
  names: readonly string[];
  hands: readonly (readonly CardModel[])[];
  turn: number | null;
  trick: readonly { by: number; card: CardModel }[];
  /** Small line under each seat (bid, tricks taken…). */
  notes?: readonly ReactNode[];
  /** Header line above the table: trump, scores, round. */
  header?: ReactNode;
  log: ReactNode;
  /** Buttons or panels shown between the table and your hand (bidding, next hand…). */
  controls?: ReactNode;
  prompt: ReactNode;
  handActions?: ReactNode;
  playable?: ReadonlySet<string> | undefined;
  selected?: ReadonlySet<string> | undefined;
  onCardClick?: ((card: CardModel) => void) | undefined;
  /** Cards that stay clickable (e.g. any card while choosing cards to pass). */
  isCardInteractive?: ((card: CardModel) => boolean) | undefined;
  /** Optional extra element in the centre (e.g. the turned-up trump card). */
  centerExtra?: ReactNode;
  /** Hide the empty trick area (e.g. while bidding) to leave room for the controls. */
  showTrick?: boolean;
}

const AREA = ['col-start-2 row-start-3', 'col-start-1 row-start-2', 'col-start-2 row-start-1', 'col-start-3 row-start-2'];

/**
 * Four-handed trick-taking table: opponents across the top, the trick laid out like a compass
 * in the middle, your hand at the bottom. Shared by Hearts, Spades, Euchre, Napoleon and Oh Hell.
 */
export function TrickTable({
  names,
  hands,
  turn,
  trick,
  notes = [],
  header,
  log,
  controls,
  prompt,
  handActions,
  playable,
  selected,
  onCardClick,
  isCardInteractive,
  centerExtra,
  showTrick = true,
}: TrickTableProps) {
  const size = { width: 'var(--card-w)', height: 'var(--card-h)' };
  const players = hands.length;
  return (
    <div className="layout-table flex flex-col gap-2">
      <div className="area-seats flex flex-col gap-1">
        {header && <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream/80">{header}</div>}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3]
            .filter((p) => p < players)
            .map((p) => (
              <Seat key={p} name={names[p]!} cards={hands[p]!} active={turn === p} note={notes[p]} />
            ))}
        </div>
      </div>
      <div className="area-side flex flex-col items-center gap-2">
        <div className="mid-cards flex items-center gap-3">
          {showTrick && (
            <div className="trick-compass grid grid-cols-[repeat(3,var(--card-w))] grid-rows-[repeat(3,calc(var(--card-h)*0.62))] gap-x-1">
              {trick.map(({ by, card }) => (
                <div key={card.id} className={`${AREA[by % 4]} flex items-center justify-center`}>
                  <Card card={card} style={size} />
                </div>
              ))}
            </div>
          )}
          {centerExtra}
        </div>
        <Log className="max-w-md">{log}</Log>
        {controls}
      </div>
      <HandArea active={turn === 0} prompt={prompt} actions={handActions}>
        <Pile
          cards={hands[0]!}
          layout="fan-right"
          spread={hands[0]!.length > 10 ? 1.2 : 1.6}
          label="Your hand"
          highlightedIds={playable}
          selectedIds={selected}
          onCardClick={onCardClick}
          isCardInteractive={(c) => (isCardInteractive ? isCardInteractive(c) : !playable || playable.has(c.id))}
          emptyLabel=""
        />
      </HandArea>
    </div>
  );
}
