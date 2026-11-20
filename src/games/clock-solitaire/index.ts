import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { clockRules, type ClockAction, type ClockState } from './logic';

const clock: GameDefinition<ClockState, ClockAction> = {
  ...findGame('clock-solitaire')!,
  rules: clockRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Turned',
  howTo:
    'Thirteen face-down piles form a clock: Ace at one o’clock up to Queen at twelve, Kings in the centre. Tap the glowing pile to turn its top card; it slides face up under the pile of its own hour, and that pile glows next. You win if every card is turned before the fourth King appears.',
};
export default clock;
