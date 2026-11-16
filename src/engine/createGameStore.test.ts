import { describe, expect, it } from 'vitest';
import type { GameRules } from '@/core/types/game';
import { createGameStore } from './createGameStore';

type S = { n: number; start: number };
type A = { type: 'inc' } | { type: 'noop' };

const rules: GameRules<S, A> = {
  setup: (rng) => {
    const start = rng.int(100);
    return { n: start, start };
  },
  reduce: (s, a) => (a.type === 'inc' ? { ...s, n: s.n + 1 } : s),
  status: (s) => (s.n - s.start >= 3 ? 'won' : 'playing'),
};

describe('createGameStore', () => {
  it('dispatches, undoes, restarts and stops at game end', () => {
    const store = createGameStore(rules);
    store.getState().newGame(7);
    const start = store.getState().state.n;

    store.getState().dispatch({ type: 'inc' });
    store.getState().dispatch({ type: 'noop' }); // illegal → no history entry
    expect(store.getState().state.n).toBe(start + 1);
    expect(store.getState().history).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().state.n).toBe(start);

    for (let i = 0; i < 5; i++) store.getState().dispatch({ type: 'inc' });
    expect(store.getState().status).toBe('won');
    expect(store.getState().state.n).toBe(start + 3);

    store.getState().restart();
    expect(store.getState().state.n).toBe(start);
    expect(store.getState().history).toHaveLength(0);
  });
});

describe('undo with auto steps', () => {
  it('skips automatic steps back to the last human move', () => {
    const store = createGameStore(rules);
    store.getState().newGame(1);
    const start = store.getState().state.n;
    store.getState().dispatch({ type: 'inc' });
    store.getState().dispatch({ type: 'inc' }, { auto: true });
    expect(store.getState().state.n).toBe(start + 2);
    store.getState().undo();
    expect(store.getState().state.n).toBe(start);
  });
});
