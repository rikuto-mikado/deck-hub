import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { gopsRules, type GopsAction, type GopsState } from './logic';

const gops: GameDefinition<GopsState, GopsAction> = {
  ...findGame('gops')!,
  rules: gopsRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [CPU_OPTION],
  howTo:
    'You hold the thirteen spades, your opponent the thirteen hearts. Each round a diamond is turned as the prize (A = 1 … K = 13). Both of you bid one card at the same time; the higher bid takes the prize. On a tie the prize stays and the next diamond joins it. Most prize points after thirteen rounds wins.',
};
export default gops;
