import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { monteCarloRules, type MonteCarloAction, type MonteCarloState } from './logic';

const monteCarlo: GameDefinition<MonteCarloState, MonteCarloAction> = {
  ...findGame('monte-carlo')!,
  rules: monteCarloRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Removed',
  howTo:
    'Tap two cards of the same rank that touch — side by side, above and below, or diagonally — to remove them. Then Consolidate & deal: the remaining cards slide left and up to close the gaps and the stock fills the grid again. Clear all 52 cards to win.',
};
export default monteCarlo;
