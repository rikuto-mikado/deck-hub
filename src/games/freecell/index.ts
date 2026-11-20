import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { freeCellRules, type FreeCellAction, type FreeCellState } from './logic';

const freecell: GameDefinition<FreeCellState, FreeCellAction> = {
  ...findGame('freecell')!,
  rules: freeCellRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  options: [
    {
      id: 'decks',
      label: 'Mode',
      help: 'Double FreeCell: 104 cards in ten cascades, with eight free cells and eight foundations.',
      choices: [
        { value: '1', label: 'Classic (1 deck)' },
        { value: '2', label: 'Double FreeCell (2 decks)' },
      ],
      default: '1',
    },
  ],
  howTo:
    'Every card is face up. Build columns down in alternating colors and park single cards in the four free cells. Runs can move as far as your free space allows. Safe cards go to the foundations automatically.',
};
export default freecell;
