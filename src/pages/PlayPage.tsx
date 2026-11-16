import { useEffect, useState } from 'react';
import { ErrorScreen } from '@/app/ErrorBoundary';
import { href, useQuery } from '@/app/router';
import { GameScreen } from '@/engine/GameScreen';
import { useResettableState } from '@/ui/hooks/useResettableState';
import { findGame, type AnyGameDefinition } from '@/games/registry';

export function PlayPage({ gameId }: { gameId: string }) {
  const entry = findGame(gameId);
  const seedParam = useQuery().get('seed');
  const seed = seedParam && /^\d+$/.test(seedParam) ? Number(seedParam) : undefined;
  const [attempt, setAttempt] = useState(0);
  // Loading state belongs to one game and one attempt; switching either starts over.
  const [load, setLoad] = useResettableState<{ def: AnyGameDefinition | null; failed: boolean }>(
    () => ({ def: null, failed: false }),
    [entry, attempt],
  );
  const loaded = load.def;
  const failed = load.failed;

  useEffect(() => {
    let alive = true;
    entry
      ?.load?.()
      .then((def) => alive && setLoad({ def, failed: false }))
      // Usually a dropped connection while fetching the game's code.
      .catch(() => alive && setLoad({ def: null, failed: true }));
    return () => {
      alive = false;
    };
    // `attempt` is the retry button: changing it is what re-runs the load.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [entry, attempt, setLoad]);

  if (!entry?.load) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <p className="font-display text-4xl text-heading">No such table</p>
          <a href={href('')} className="mt-4 inline-block text-sm text-gold hover:text-gold-bright">
            Back to all games
          </a>
        </div>
      </div>
    );
  }
  if (failed) {
    return (
      <ErrorScreen
        title="Couldn’t open the table"
        detail={`${entry.name} didn’t finish loading. Check your connection and try again.`}
        onRetry={() => setAttempt((a) => a + 1)}
      />
    );
  }
  return loaded ? (
    <GameScreen key={`${loaded.id}:${seed ?? ''}`} game={loaded} seed={seed} />
  ) : (
    <p className="grid min-h-[60dvh] place-items-center text-sm tracking-[0.3em] text-muted uppercase">Shuffling…</p>
  );
}
