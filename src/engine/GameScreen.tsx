import { AnimatePresence, motion } from 'motion/react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { href } from '@/app/router';
import { play } from '@/app/sound';
import type { GameDefinition, Hint } from '@/core/types/game';
import { toneOf } from '@/games/registry';
import { TableContext } from '@/ui/card/TableContext';
import { Button } from '@/ui/common/Button';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { Table } from '@/ui/table/Table';
import { Celebration } from './Celebration';
import { ControlBar } from './ControlBar';
import { createGameStore } from './createGameStore';
import { RulesPanel, preferredOptions } from './RulesPanel';

const HINT_MS = 2600;

/** Generic shell for every game: control bar, lit table, notes, hints, sounds and the result dialog. */
export function GameScreen<S, A>({ game, seed }: { game: GameDefinition<S, A>; seed?: number | undefined }) {
  const [store] = useState(() =>
    createGameStore(game.rules, {
      seed,
      ruleOptions: preferredOptions(game.id, game.options),
    }),
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  const ruleOptions = useStore(store, (s) => s.ruleOptions);
  const state = useStore(store, (s) => s.state);
  const status = useStore(store, (s) => s.status);
  const canUndo = useStore(store, (s) => s.autoSteps.some((a) => !a));
  const moves = useStore(store, (s) => s.autoSteps.filter((a) => !a).length);
  const startedAt = useStore(store, (s) => s.startedAt);
  const endedAt = useStore(store, (s) => s.endedAt);
  const dealId = useStore(store, (s) => s.dealId);
  const dealSeed = useStore(store, (s) => s.seed);
  const { dispatch, undo, restart, newGame } = store.getState();
  const score = game.rules.score?.(state);
  const undoable = game.undoable ?? true;
  const scoreLabel = game.scoreLabel ?? 'Score';
  const hasRules = !!game.options?.length;
  const stuck = status === 'playing' && !!game.rules.stuck?.(state);
  useAutoSteps(game, store, state);

  // Hints light up cards for a moment and may carry a line of advice; any move clears them.
  const [hint, setHint] = useResettableState<Hint | null>(() => null, [state]);
  const hintTimer = useRef(0);
  const showHint = useCallback(() => {
    window.clearTimeout(hintTimer.current);
    setHint(game.rules.hint?.(store.getState().state) ?? { message: 'No useful move right now.' });
    hintTimer.current = window.setTimeout(() => setHint(null), HINT_MS);
  }, [game, store, setHint]);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  // Sounds follow the store: a riffle for each deal, a tick per move, a chime or a sigh at the end.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.dealId !== prev.dealId) play('deal');
        else if (s.status !== prev.status && s.status === 'won') play('win');
        else if (s.status !== prev.status && s.status === 'lost') play('lose');
        // Only the player's own moves buzz; CPU turns and auto-play just make a sound.
        else if (s.state !== prev.state) play('place', { haptic: s.autoSteps.at(-1) === false });
      }),
    [store],
  );

  // A new deal lays its cards out once; after that, cards moving between piles aren't "dealt" again.
  const [dealing, setDealing] = useResettableState(() => true, [dealId]);
  useEffect(() => {
    const t = window.setTimeout(() => setDealing(false), 400);
    return () => window.clearTimeout(t);
    // `dealId` is the trigger: each new deal gets its own short dealing window.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [dealId, setDealing]);

  const table = useMemo(() => ({ dealId, dealing, hinted: new Set(hint?.cards ?? []) }), [dealId, dealing, hint]);

  return (
    <div className="flex flex-col gap-5 short:gap-2">
      <ControlBar
        title={game.name}
        score={score !== undefined ? { label: scoreLabel, value: score } : undefined}
        stats={undoable ? { moves, startedAt, endedAt } : undefined}
        onUndo={undoable ? undo : undefined}
        canUndo={canUndo}
        onHint={game.rules.hint ? showHint : undefined}
        onRestart={undoable ? restart : undefined}
        onNewGame={() => newGame()}
        onRules={hasRules ? () => setRulesOpen(true) : undefined}
      />

      <div className="relative">
        <TableContext.Provider value={table}>
          <Table tone={toneOf(game)} groupId={`deal-${dealId}`}>
            <Suspense fallback={<div className="grid h-64 place-items-center text-cream/60">Shuffling…</div>}>
              <game.Board key={dealId} state={state} dispatch={dispatch} />
            </Suspense>
          </Table>
        </TableContext.Provider>

        {/* Hint advice and the stuck notice float over the bottom of the table. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4" aria-live="polite">
          <AnimatePresence>
            {(hint?.message || stuck) && (
              <motion.div
                key={stuck ? 'stuck' : hint?.message}
                className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-full bg-panel/95 px-5 py-2.5 text-sm text-cream shadow-[inset_0_0_0_1px_rgb(201_164_92/0.35),0_16px_32px_rgb(0_0_0/0.45)] backdrop-blur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {stuck ? (
                  <>
                    <span>No more useful moves.</span>
                    {canUndo && (
                      <button type="button" onClick={undo} className="font-semibold text-gold-bright hover:underline">
                        Undo
                      </button>
                    )}
                    <button type="button" onClick={() => newGame()} className="font-semibold text-gold-bright hover:underline">
                      Deal again
                    </button>
                  </>
                ) : (
                  <span>{hint?.message}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-1 text-xs leading-relaxed text-muted">
        {hasRules && (
          <p className="tracking-wide">
            {game
              .options!.map((o) => `${o.label}: ${o.choices.find((c) => c.value === ruleOptions[o.id])?.label ?? '—'}`)
              .join(' · ')}
          </p>
        )}
        {game.howTo && <p className="max-w-3xl">{game.howTo}</p>}
      </div>

      {hasRules && (
        <RulesPanel
          key={String(rulesOpen)}
          gameId={game.id}
          specs={game.options!}
          current={ruleOptions}
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          onApply={(opts) => {
            setRulesOpen(false);
            newGame(undefined, opts);
          }}
        />
      )}

      {status === 'won' && <Celebration seed={dealSeed} />}

      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Let the shower of cards play before the dialog covers it.
            transition={{ delay: status === 'won' ? 1.4 : 0.2 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="result-title"
              className="w-full max-w-sm rounded-3xl bg-panel px-8 py-9 text-center shadow-[inset_0_0_0_1px_rgb(201_164_92/0.3),0_40px_80px_rgb(0_0_0/0.6)]"
              initial={{ scale: 0.9, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: status === 'won' ? 1.4 : 0.2 }}
            >
              <p className="text-[11px] font-medium tracking-[0.3em] text-gold uppercase">{game.name}</p>
              <h2 id="result-title" className="mt-3 font-display text-5xl font-semibold text-heading">
                {status === 'won' ? 'Well played' : 'Game over'}
              </h2>
              {game.rules.summary ? (
                <p className="mt-3 text-sm leading-relaxed text-cream/75">{game.rules.summary(state)}</p>
              ) : (
                score !== undefined && (
                  <p className="mt-3 text-sm text-cream/75">
                    {scoreLabel} {score}
                  </p>
                )
              )}
              {undoable && endedAt && (
                <p className="mt-1 text-xs text-muted tabular-nums">
                  {moves} moves · {Math.floor((endedAt - startedAt) / 60000)}:
                  {String(Math.floor(((endedAt - startedAt) / 1000) % 60)).padStart(2, '0')}
                </p>
              )}
              <div className="mt-7 flex justify-center gap-2">
                {status === 'lost' && undoable && canUndo && <Button onClick={undo}>Undo</Button>}
                <Button variant="primary" onClick={() => newGame()}>
                  Deal again
                </Button>
              </div>
              <a
                href={href('')}
                className="mt-4 inline-block text-xs text-muted underline-offset-4 hover:text-cream hover:underline"
              >
                Back to all games
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Runs `rules.auto` steps (CPU turns, dealer draws, flip-backs) on a timer.
 * A pending step keeps its timer while the same action is still proposed, so
 * fast human play in real-time games (Speed) doesn't starve the CPU.
 */
function useAutoSteps<S, A>(game: GameDefinition<S, A>, store: ReturnType<typeof createGameStore<S, A>>, state: S) {
  const pending = useRef<{ key: string; timer: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const step = store.getState().status === 'playing' ? game.rules.auto?.(state) : null;
    if (!step) {
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = null;
      return;
    }
    const key = JSON.stringify(step.action);
    if (pending.current?.key === key) return;
    if (pending.current) window.clearTimeout(pending.current.timer);
    const timer = window.setTimeout(() => {
      pending.current = null;
      store.getState().dispatch(step.action, { auto: true });
      setTick((t) => t + 1); // re-evaluate even if the action turned out to be a no-op
    }, step.delayMs);
    pending.current = { key, timer };
    // `tick` re-runs this after each step fires, even when the step changed nothing.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [game, store, state, tick]);

  useEffect(
    () => () => {
      // Also runs on StrictMode's simulated unmount, so forget the timer as well as clearing it.
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = null;
    },
    [],
  );
}
