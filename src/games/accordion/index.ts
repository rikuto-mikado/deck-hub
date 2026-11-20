import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { accordionRules, type AccordionAction, type AccordionState } from './logic';

const accordion: GameDefinition<AccordionState, AccordionAction> = {
  ...findGame('accordion')!,
  rules: accordionRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Piles',
  howTo:
    'All 52 cards lie in a line (read left to right, row by row). A pile may move onto the pile immediately to its left, or three places to its left, when their top cards share a suit or a rank. Tap a pile to move it (tap again on a target if both moves are possible), or drag it. Squeeze everything into one pile to win.',
};
export default accordion;
