import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { heartsRules, type HeartsAction, type HeartsState } from './logic';

const hearts: GameDefinition<HeartsState, HeartsAction> = {
  ...findGame('hearts')!,
  rules: heartsRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'target',
      label: 'Game ends at',
      choices: [
        { value: '100', label: '100 points' },
        { value: '50', label: '50 points' },
      ],
      default: '100',
    },
    {
      id: 'passing',
      label: 'Pass three cards',
      help: 'Left, right, across, then a hand with no passing.',
      choices: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
      default: 'on',
    },
    CPU_OPTION,
  ],
  howTo:
    'Avoid points: each heart is 1 and the Q♠ is 13. The 2♣ leads the first trick, where no points may be played. Follow suit if you can. Hearts cannot be led until one has been played. Take all 26 points to shoot the moon: everyone else gets 26. When someone reaches the limit, the lowest score wins.',
};
export default hearts;
