import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const same = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/**
 * Local state that starts over whenever any of `deps` changes (e.g. a selection that belongs to one
 * game state). Resetting happens during render, so there is no extra render as with an effect.
 * The setter is stable, so it is safe in effect dependency lists.
 */
export function useResettableState<T>(initial: () => T, deps: readonly unknown[]): [T, (next: T | ((prev: T) => T)) => void] {
  const [entry, setEntry] = useState(() => ({ deps, value: initial() }));
  const latest = useRef({ deps, initial });
  useLayoutEffect(() => {
    latest.current = { deps, initial };
  });
  const current = same(entry.deps, deps) ? entry.value : initial();
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setEntry((e) => {
      const { deps: now, initial: init } = latest.current;
      const prev = same(e.deps, now) ? e.value : init();
      return { deps: now, value: typeof next === 'function' ? (next as (p: T) => T)(prev) : next };
    });
  }, []);
  return [current, set];
}
