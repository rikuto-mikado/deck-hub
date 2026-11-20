import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { holdemRules, type HoldemAction, type HoldemState } from './logic';

const holdem: GameDefinition<HoldemState, HoldemAction> = {
  ...findGame('texas-holdem')!,
  rules: holdemRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Chips',
  options: [
    {
      id: 'seats',
      label: 'Table',
      choices: [
        { value: '4', label: '4 seats' },
        { value: '2', label: 'Heads-up' },
      ],
      default: '4',
    },
    CPU_OPTION,
  ],
  howTo:
    'No-limit Hold’em with 10/20 blinds and 1,000 chips each. You get two private cards; five shared cards come in three streets (flop, turn, river) with a betting round before each and after the last. Fold, check, call, bet or raise (at least the size of the last raise; all in any time). The best five-card hand from your two cards and the board wins the pot; side pots cover all-ins. Take every chip to win. Your opponents each have their own style — read them.',
};
export default holdem;
