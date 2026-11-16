import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { highLowRules, type HighLowAction, type HighLowState } from './logic';

const highLow: GameDefinition<HighLowState, HighLowAction> = {
  ...findGame('high-low')!,
  rules: highLowRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Streak',
  howTo:
    'Guess whether the next card is higher or lower (Ace is low). Same rank is a free pass. One miss ends the run. The odds shown come from the cards you have not seen yet.',
};
export default highLow;
