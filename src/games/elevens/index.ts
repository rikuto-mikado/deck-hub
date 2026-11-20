import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { elevensRules, type ElevensAction, type ElevensState } from './logic';

const elevens: GameDefinition<ElevensState, ElevensAction> = {
  ...findGame('elevens')!,
  rules: elevensRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Cleared',
  howTo:
    'Nine cards lie face up. Select two number cards that add up to 11 (Ace counts 1), or a Jack, Queen and King together, and fresh cards are dealt over them. Clear the entire deck to win.',
};
export default elevens;
