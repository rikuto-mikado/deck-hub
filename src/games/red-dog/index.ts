import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { redDogRules, type RedDogAction, type RedDogState } from './logic';

const redDog: GameDefinition<RedDogState, RedDogAction> = {
  ...findGame('red-dog')!,
  rules: redDogRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Chips',
  howTo:
    'Two cards are dealt face up. Consecutive ranks push; a pair draws a third card that pays 11:1 if it makes three of a kind. Otherwise you may double your bet before the third card: if it lands strictly between the two, the spread pays 5:1 (1 card), 4:1 (2), 2:1 (3) or 1:1 (4+). Aces are high. Reach 1,000 chips to win.',
};
export default redDog;
