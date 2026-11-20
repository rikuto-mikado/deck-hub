import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { baccaratRules, type BaccaratAction, type BaccaratState } from './logic';

const baccarat: GameDefinition<BaccaratState, BaccaratAction> = {
  ...findGame('baccarat')!,
  rules: baccaratRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Chips',
  howTo:
    'Pick a side and a stake, then Deal. Hands count the last digit of their total (10s and court cards are 0, Aces 1). Naturals of 8 or 9 stand; otherwise the fixed third-card rules decide who draws. Player pays 1:1, Banker 0.95:1 (5% commission), Tie 8:1. Double your 1,000 chips to win.',
};
export default baccarat;
