import { makeCardId } from '@/core/deck/createDeck';
import { SUITS, SUIT_SYMBOL, rankLabel, type CardId, type Rank, type Suit } from '@/core/types/card';
import type { BoardProps } from '@/core/types/game';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Badge, Slot } from '@/ui/table/TableKit';
import { TrickTable } from '@/ui/table/TrickTable';
import { seatName } from '../cpuLevel';
import { HUMAN, MIN_BID, chooseAdjutant, legal, toAct, trumpOf, type NapoleonAction, type NapoleonState } from './logic';

const RANKS: Rank[] = [1, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
/** Bid suits from strongest to weakest. */
const ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

const bidText = (b: NapoleonState['bids'][number]) =>
  b === null ? '' : b === 'pass' ? 'Pass' : `${b.count}${SUIT_SYMBOL[b.suit]}`;

export default function NapoleonBoard({ state, dispatch }: BoardProps<NapoleonState, NapoleonAction>) {
  const minCount = state.best ? state.best.bid.count : MIN_BID;
  const [count, setCount] = useResettableState(() => minCount, [state.best]);
  const [picked, setPicked] = useResettableState<Set<CardId>>(() => new Set(), [state.hands, state.phase]);
  const declaring = state.phase === 'declare' && state.napoleon === HUMAN;
  const suggested = declaring ? chooseAdjutant(state.hands[HUMAN]!, trumpOf(state)) : null;
  const [adjSuit, setAdjSuit] = useResettableState<Suit>(() => suggested?.suit ?? 'spades', [state.phase]);
  const [adjRank, setAdjRank] = useResettableState<Rank>(() => suggested?.rank ?? 1, [state.phase]);
  const names = [0, 1, 2, 3].map(
    (p) =>
      seatName(state.seats, p) +
      (state.napoleon === p ? ' ⚜' : '') +
      (state.revealed && state.adjutant === p && state.napoleon !== p ? ' (adj.)' : ''),
  );
  const myTurn = toAct(state) === HUMAN;
  const bidding = state.phase === 'bid' && state.turn === HUMAN;
  const playable = new Set<string>(myTurn ? legal(state, HUMAN).map((c) => c.id) : []);
  const beatsBest = (suit: Suit) =>
    !state.best ||
    count > state.best.bid.count ||
    (count === state.best.bid.count && ORDER.indexOf(suit) < ORDER.indexOf(state.best.bid.suit));
  const toggle = (id: CardId) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < 4) n.add(id);
      return n;
    });
  return (
    <TrickTable
      showTrick={state.phase === 'play'}
      names={names}
      hands={state.hands}
      turn={state.phase === 'bid' ? state.turn : declaring ? HUMAN : toAct(state)}
      trick={state.trick}
      notes={state.phase === 'bid' ? state.bids.map(bidText) : state.faces.map((f, p) => `${state.points[p]} pts · ${f} faces`)}
      header={
        <>
          <Badge tone="dim">
            Deal {state.deal}/{state.deals}
          </Badge>
          {state.best && state.phase !== 'bid' && (
            <Badge>
              Bid {state.best.bid.count}
              {SUIT_SYMBOL[state.best.bid.suit]}
            </Badge>
          )}
          {state.adjutantCard && (
            <Badge tone="dim">
              Adjutant {SUIT_SYMBOL[state.adjutantCard.suit]}
              {rankLabel(state.adjutantCard.rank)}
            </Badge>
          )}
        </>
      }
      centerExtra={state.adjutantCard && <Slot card={state.adjutantCard} label="Adjutant card" caption="adjutant" />}
      log={state.log}
      controls={
        <>
          {bidding && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Button className="min-h-9 px-3" disabled={count <= minCount} onClick={() => setCount(count - 1)}>
                −
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{count}</span>
              <Button className="min-h-9 px-3" disabled={count >= 20} onClick={() => setCount(count + 1)}>
                +
              </Button>
              {SUITS.map((x) => (
                <Button
                  key={x}
                  variant="primary"
                  className="min-h-9 min-w-11 px-2"
                  disabled={!beatsBest(x)}
                  onClick={() => dispatch({ type: 'bid', by: HUMAN, bid: { count, suit: x } })}
                >
                  {SUIT_SYMBOL[x]}
                </Button>
              ))}
              <Button className="min-h-9" onClick={() => dispatch({ type: 'bid', by: HUMAN, bid: null })}>
                Pass
              </Button>
            </div>
          )}
          {declaring && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-cream/80">
              <span>Adjutant:</span>
              <select
                className="rounded bg-black/40 px-1 py-1"
                value={adjSuit}
                onChange={(e) => setAdjSuit(e.target.value as Suit)}
                aria-label="Adjutant suit"
              >
                {SUITS.map((x) => (
                  <option key={x} value={x}>
                    {SUIT_SYMBOL[x]}
                  </option>
                ))}
              </select>
              <select
                className="rounded bg-black/40 px-1 py-1"
                value={adjRank}
                onChange={(e) => setAdjRank(Number(e.target.value) as Rank)}
                aria-label="Adjutant rank"
              >
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {rankLabel(r)}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                disabled={picked.size !== 4}
                onClick={() => dispatch({ type: 'declare', adjutant: makeCardId(adjSuit, adjRank), discard: [...picked] })}
              >
                Discard 4 &amp; start
              </Button>
            </div>
          )}
          {state.phase === 'dealOver' && (
            <Button variant="primary" onClick={() => dispatch({ type: 'next' })}>
              Next deal
            </Button>
          )}
        </>
      }
      prompt={
        declaring
          ? `Choose 4 cards to discard (${picked.size}/4) and name your adjutant`
          : bidding
            ? `Bid at least ${minCount}`
            : myTurn
              ? 'Your play'
              : 'Your hand'
      }
      playable={declaring ? undefined : playable}
      selected={picked}
      onCardClick={(c) => (declaring ? toggle(c.id) : playable.has(c.id) && dispatch({ type: 'play', by: HUMAN, id: c.id }))}
      isCardInteractive={(c) => declaring || playable.has(c.id)}
    />
  );
}
