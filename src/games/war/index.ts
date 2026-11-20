import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { warRules, type WarAction, type WarState } from './logic';

const war: GameDefinition<WarState, WarAction> = {
  ...findGame('war')!,
  rules: warRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [
    {
      id: 'length',
      label: 'Game length',
      choices: [
        { value: 'short', label: 'Short (35 cards / 20 battles)' },
        { value: 'classic', label: 'Classic (to the last card)' },
      ],
      default: 'short',
    },
    {
      id: 'warCards',
      label: 'Cards face down in a war',
      choices: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
      default: '3',
    },
  ],
  howTo:
    'Tap Flip (or your stack). The higher card takes both (Aces high). On a tie it is WAR: each side lays cards face down and flips a new card, and the winner takes everything. Short games end at 35 cards or after 20 battles.',
};
export default war;
