import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { sevensRules, type SevensAction, type SevensState } from './logic';

const sevens: GameDefinition<SevensState, SevensAction> = {
  ...findGame('sevens')!,
  rules: sevensRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  options: [CPU_OPTION],
  howTo:
    'All sevens start on the table. On your turn, play a card next to one already placed in its suit, or pass. You may pass three times; a fourth pass busts you. Be the first to empty your hand; play continues until every place is decided.',
};
export default sevens;
