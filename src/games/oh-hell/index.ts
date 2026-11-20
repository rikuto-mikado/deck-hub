import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { ohHellRules, type OhHellAction, type OhHellState } from './logic';

const ohHell: GameDefinition<OhHellState, OhHellAction> = {
  ...findGame('oh-hell')!,
  rules: ohHellRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'rounds',
      label: 'Rounds',
      choices: [
        { value: 'updown', label: 'Up and down (1–7–1)' },
        { value: 'down', label: 'Down the river (10–1)' },
      ],
      default: 'updown',
    },
    CPU_OPTION,
  ],
  howTo:
    'Each round the hand size changes and the card turned up after the deal sets trump. Everyone bids exactly how many tricks they will take; the dealer, bidding last, may not make the bids add up to the number of tricks. Follow suit if you can. Making your bid exactly scores 10 plus the bid; anything else scores nothing.',
};
export default ohHell;
