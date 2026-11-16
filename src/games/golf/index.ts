import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { golfRules, type GolfAction, type GolfState } from './logic';

const golf: GameDefinition<GolfState, GolfAction> = {
  ...findGame('golf')!,
  rules: golfRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Score',
  options: [
    {
      id: 'wrap',
      label: 'K and A connect',
      choices: [
        { value: 'off', label: 'No' },
        { value: 'on', label: 'Yes' },
      ],
      default: 'off',
    },
    {
      id: 'kingStops',
      label: 'Nothing on a King',
      help: 'A common variant: once a King is on the waste, only a stock card can follow it.',
      choices: [
        { value: 'off', label: 'Off' },
        { value: 'on', label: 'On' },
      ],
      default: 'off',
    },
  ],
  howTo:
    'Tap the bottom card of a column if it is one rank above or below the waste card. Tap the stock when stuck. Score is the cards left in the columns; clearing them all scores minus the cards left in the stock.',
};
export default golf;
