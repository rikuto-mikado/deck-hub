import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { schnapsenRules, type SchnapsenAction, type SchnapsenState } from './logic';

const schnapsen: GameDefinition<SchnapsenState, SchnapsenAction> = {
  ...findGame('schnapsen')!,
  rules: schnapsenRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Game pts',
  options: [CPU_OPTION],
  howTo:
    'Twenty cards: A 11, 10 10, K 4, Q 3, J 2. Reach 66 card points first. While the talon is open you need not follow suit; once it is closed or empty you must follow, beat the lead if you can, else trump. On your lead you may declare a King–Queen marriage (20, or 40 in trump), swap the trump Jack for the face-up trump card, or close the talon. A deal won scores 1–3 game points; first to 7 wins.',
};
export default schnapsen;
