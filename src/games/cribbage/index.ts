import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { cribbageRules, type CribbageAction, type CribbageState } from './logic';

const cribbage: GameDefinition<CribbageState, CribbageAction> = {
  ...findGame('cribbage')!,
  rules: cribbageRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'target',
      label: 'Game to',
      choices: [
        { value: '121', label: '121' },
        { value: '61', label: '61' },
      ],
      default: '121',
    },
    CPU_OPTION,
  ],
  howTo:
    'Six cards each: put two in the dealer’s crib, then a starter is cut (a Jack gives the dealer 2). Peg by taking turns to play cards without the count passing 31: 15 and 31 score 2, pairs 2/6/12, runs 1 per card; say Go when you cannot play, and the last card scores 1. Then hands and the crib are counted with the starter: fifteens, pairs, runs, flushes and his nobs. First to the target wins.',
};
export default cribbage;
