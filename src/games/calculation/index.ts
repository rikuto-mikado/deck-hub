import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { calculationRules, type CalculationAction, type CalculationState } from './logic';

const calculation: GameDefinition<CalculationState, CalculationAction> = {
  ...findGame('calculation')!,
  rules: calculationRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Built',
  howTo:
    'Suits do not matter. The foundations start A, 2, 3, 4 and build by +1, +2, +3 and +4 (wrapping past King) until each ends on a King. Turn one stock card at a time and place it on a foundation or any of the four waste piles. Only the top card of a waste pile can move, and only to a foundation.',
};
export default calculation;
