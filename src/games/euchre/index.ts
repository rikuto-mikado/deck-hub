import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { euchreRules, type EuchreAction, type EuchreState } from './logic';

const euchre: GameDefinition<EuchreState, EuchreAction> = {
  ...findGame('euchre')!,
  rules: euchreRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Team',
  options: [
    {
      id: 'target',
      label: 'Game to',
      choices: [
        { value: '10', label: '10 points' },
        { value: '5', label: '5 points' },
      ],
      default: '10',
    },
    CPU_OPTION,
  ],
  howTo:
    'A 24-card deck (9 to Ace), five cards each, you and North against West and East. Order up the turned card as trump (the dealer picks it up), or in the second round name another suit; the dealer must choose if everyone passes. The Jack of trump (Right Bower) is highest, then the other Jack of the same colour (Left Bower). The makers need 3 tricks for 1 point, all 5 for 2 (4 alone); fail and the defenders score 2.',
};
export default euchre;
