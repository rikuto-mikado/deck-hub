import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { bigTwoRules, type BigTwoAction, type BigTwoState } from './logic';

const bigTwo: GameDefinition<BigTwoState, BigTwoAction> = {
  ...findGame('big-two')!,
  rules: bigTwoRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [CPU_OPTION],
  howTo:
    'Cards rank 3 (low) … K, A, 2 (high); suits break ties ♦ < ♣ < ♥ < ♠, so the 2♠ is the top card. The holder of the 3♦ leads with a play that includes it. Play singles, pairs, triples or five-card poker hands (straight < flush < full house < four of a kind + one < straight flush); each play must have the same number of cards and beat the last, or you pass. When everyone passes, the last player leads anything. First out wins.',
};
export default bigTwo;
