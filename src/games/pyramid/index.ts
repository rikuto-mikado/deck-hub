import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { pyramidRules, type PyramidAction, type PyramidState } from './logic';

const pyramid: GameDefinition<PyramidState, PyramidAction> = {
  ...findGame('pyramid')!,
  rules: pyramidRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Cards left',
  options: [
    {
      id: 'passes',
      label: 'Passes through the deck',
      choices: [
        { value: '1', label: '1' },
        { value: '3', label: '3' },
        { value: 'unlimited', label: 'Unlimited' },
      ],
      default: '3',
    },
  ],
  howTo: 'Remove two uncovered cards that add up to 13 (J=11, Q=12, K=13; Kings go alone). The waste top card can be paired too.',
};
export default pyramid;
