import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { triPeaksRules, type TriPeaksAction, type TriPeaksState } from './logic';

const tripeaks: GameDefinition<TriPeaksState, TriPeaksAction> = {
  ...findGame('tripeaks')!,
  rules: triPeaksRules,
  Board: lazy(() => import('./Board')),
  howTo:
    'Tap an uncovered card one rank above or below the waste card (K and A connect). Longer streaks score more; peak tips give a bonus. Drawing resets the streak.',
};
export default tripeaks;
