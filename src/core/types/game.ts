import type { ComponentType, LazyExoticComponent } from 'react';
import type { Rng } from '../deck/rng';

export type GameStatus = 'playing' | 'won' | 'lost';

/** Selected rule variants, e.g. { suits: '4', draw: '3' }. Values are option choice ids. */
export type RuleOptions = Readonly<Record<string, string>>;

/** A rule variant the player can pick before a game (shown in the Rules panel). */
export interface OptionSpec {
  id: string;
  label: string;
  /** Optional explanation shown under the control. */
  help?: string;
  choices: readonly { value: string; label: string }[];
  default: string;
}

/** Reads an on/off option. */
export const isOn = (options: RuleOptions, id: string) => options[id] === 'on';
export type GameCategory = 'solitaire' | 'special' | 'casino' | 'trick-taking' | 'cpu';

/** A suggested move: cards to light up, and/or a short line of advice. */
export interface Hint {
  cards?: string[];
  message?: string;
}

/** An action the game wants to take on its own after a delay (CPU turns, dealer play, flip-back). */
export interface AutoStep<A> {
  action: A;
  delayMs: number;
}

/**
 * Pure rules of one game. Nothing here may touch React or the DOM,
 * so the same logic can drive the UI, tests, hints and CPU players.
 * Any randomness during play must come from a seed stored in the state.
 */
export interface GameRules<S, A> {
  /** `options` holds the chosen rule variants; missing keys mean the default. */
  setup(rng: Rng, options?: RuleOptions): S;
  /** Must return the same state object when the action is illegal. */
  reduce(state: S, action: A): S;
  status(state: S): GameStatus;
  /** Next automatic step, if any. Evaluated after every state change. */
  auto?(state: S): AutoStep<A> | null;
  score?(state: S): number;
  /** Optional result line for the end-of-game dialog. */
  summary?(state: S): string;
  /** A good next move for the player, or null when there is nothing useful to suggest. */
  hint?(state: S): Hint | null;
  /** True when the player can no longer make progress (shown as a gentle notice, not a loss). */
  stuck?(state: S): boolean;
}

export interface BoardProps<S, A> {
  state: S;
  dispatch: (action: A) => void;
}

export interface GameMeta {
  id: string;
  name: string;
  description: string;
  category: GameCategory;
  players: number;
  difficulty: 1 | 2 | 3;
}

export interface GameDefinition<S, A> extends GameMeta {
  rules: GameRules<S, A>;
  Board: LazyExoticComponent<ComponentType<BoardProps<S, A>>> | ComponentType<BoardProps<S, A>>;
  /** Undo is off for games against the CPU or with hidden information. Default true. */
  undoable?: boolean;
  /** Label for the score readout (e.g. "Chips"). */
  scoreLabel?: string;
  /** Short how-to-play text shown under the table. */
  howTo?: string;
  /** Rule variants; the chosen values are passed to rules.setup. */
  options?: readonly OptionSpec[];
}
