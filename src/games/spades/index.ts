import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { spadesRules, type SpadesAction, type SpadesState } from './logic';

const spades: GameDefinition<SpadesState, SpadesAction> = {
  ...findGame('spades')!,
  rules: spadesRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Team',
  options: [
    {
      id: 'target',
      label: 'Game to',
      choices: [
        { value: '500', label: '500' },
        { value: '300', label: '300' },
      ],
      default: '500',
    },
    CPU_OPTION,
  ],
  howTo:
    'You partner North against West and East. Everyone bids the tricks they expect (Nil = none). Spades are always trump and cannot be led until broken. A team making its combined bid scores 10 per bid trick plus 1 per extra trick (a bag); failing loses 10 per bid trick. Nil scores ±100. Every 10 bags costs 100.',
};
export default spades;
