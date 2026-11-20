import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { ninetyNineRules, type NinetyNineAction, type NinetyNineState } from './logic';

const ninetyNine: GameDefinition<NinetyNineState, NinetyNineAction> = {
  ...findGame('ninety-nine')!,
  rules: ninetyNineRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Lives',
  options: [CPU_OPTION],
  howTo:
    'Play a card and draw one, adding its value to the running total without going over 99. Specials: 4 reverses the direction, 9 passes (+0), 10 is +10 or −10, J and Q are +10, K jumps straight to 99, A is +1 or +11. If you cannot play without passing 99 you lose one of your three lives and a new round is dealt. Be the last player standing.',
};
export default ninetyNine;
