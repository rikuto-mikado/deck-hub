import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { pokerSquaresRules, type PokerSquaresAction, type PokerSquaresState } from './logic';

const pokerSquares: GameDefinition<PokerSquaresState, PokerSquaresAction> = {
  ...findGame('poker-squares')!,
  rules: pokerSquaresRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Score',
  options: [
    {
      id: 'scoring',
      label: 'Scoring',
      help: 'American pays by hand rank; British rewards straights over flushes, as they are harder to build here.',
      choices: [
        { value: 'american', label: 'American' },
        { value: 'british', label: 'British' },
      ],
      default: 'american',
    },
  ],
  howTo:
    'Place each of 25 cards on the 5×5 grid; once placed, a card never moves. Every row, column and both diagonals score as a poker hand. Reach the goal (70 American, 30 British) to win.',
};
export default pokerSquares;
