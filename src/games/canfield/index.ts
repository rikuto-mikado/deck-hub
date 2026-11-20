import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { canfieldRules, type CanfieldAction, type CanfieldState } from './logic';

const canfield: GameDefinition<CanfieldState, CanfieldAction> = {
  ...findGame('canfield')!,
  rules: canfieldRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  options: [
    {
      id: 'draw',
      label: 'Stock',
      choices: [
        { value: '3', label: 'Draw 3' },
        { value: '1', label: 'Draw 1' },
      ],
      default: '3',
    },
  ],
  howTo:
    'The first foundation card sets the base rank for all four foundations, which build up by suit and wrap from King to Ace. Columns build down in alternating colours (wrapping A → K); move a top card or a whole column. Empty columns refill from the 13-card reserve. Turn the stock as often as you like.',
};
export default canfield;
