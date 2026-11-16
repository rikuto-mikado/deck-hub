import { createStore, type StoreApi } from 'zustand/vanilla';
import { createRng, randomSeed } from '@/core/deck/rng';
import type { GameRules, GameStatus, RuleOptions } from '@/core/types/game';

export interface GameStoreState<S, A> {
  seed: number;
  ruleOptions: RuleOptions;
  state: S;
  history: S[];
  /** Parallel to history: true when that step was taken automatically (undo skips over it). */
  autoSteps: boolean[];
  status: GameStatus;
  /** When this deal started and (if over) ended, in ms since epoch: drives the clock. */
  startedAt: number;
  endedAt: number | null;
  /** Bumped on every new deal or restart so the table can replay its dealing animation. */
  dealId: number;
  dispatch: (action: A, opts?: { auto?: boolean }) => void;
  undo: () => void;
  restart: () => void;
  /** Starts a new deal; passing ruleOptions also switches the rules. */
  newGame: (seed?: number, ruleOptions?: RuleOptions) => void;
}

export interface GameStoreOptions {
  historyLimit?: number;
  /** Force a specific deal. */
  seed?: number | undefined;
  /** Rule variants for the first game. */
  ruleOptions?: RuleOptions | undefined;
}

/**
 * Generic store shared by every game: deterministic deals, rule variants and undo history.
 * Games live in memory only; nothing is saved between visits.
 */
export function createGameStore<S, A>(rules: GameRules<S, A>, options: GameStoreOptions = {}): StoreApi<GameStoreState<S, A>> {
  const { historyLimit = 500, seed: forcedSeed, ruleOptions: startOptions = {} } = options;

  let deals = 0;
  const fresh = (seed: number, ruleOptions: RuleOptions) => {
    const state = rules.setup(createRng(seed), ruleOptions);
    const status = rules.status(state);
    const now = Date.now();
    return {
      seed,
      ruleOptions,
      state,
      history: [] as S[],
      autoSteps: [] as boolean[],
      status,
      startedAt: now,
      endedAt: status === 'playing' ? null : now,
      dealId: ++deals,
    };
  };

  const initial = fresh(forcedSeed ?? randomSeed(), startOptions);

  return createStore<GameStoreState<S, A>>()((set, get) => ({
    ...initial,
    dispatch: (action, opts) => {
      const { state, history, autoSteps, status } = get();
      if (status !== 'playing') return;
      const next = rules.reduce(state, action);
      if (next === state) return;
      const nextHistory = [...history, state].slice(-historyLimit);
      const nextAuto = [...autoSteps, !!opts?.auto].slice(-historyLimit);
      const nextStatus = rules.status(next);
      set({
        state: next,
        history: nextHistory,
        autoSteps: nextAuto,
        status: nextStatus,
        endedAt: nextStatus === 'playing' ? null : Date.now(),
      });
    },
    undo: () => {
      const { history, autoSteps } = get();
      // Pop automatic steps, then the human move that triggered them.
      let i = history.length - 1;
      while (i > 0 && autoSteps[i]) i--;
      const prev = history[i];
      if (prev === undefined) return;
      const nextHistory = history.slice(0, i);
      const nextAuto = autoSteps.slice(0, i);
      const nextStatus = rules.status(prev);
      set({
        state: prev,
        history: nextHistory,
        autoSteps: nextAuto,
        status: nextStatus,
        endedAt: nextStatus === 'playing' ? null : get().endedAt,
      });
    },
    restart: () => {
      const next = fresh(get().seed, get().ruleOptions);
      set(next);
    },
    newGame: (seed = randomSeed(), ruleOptions = get().ruleOptions) => {
      const next = fresh(seed, ruleOptions);
      set(next);
    },
  }));
}
