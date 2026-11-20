import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { doubtRules, type DoubtAction, type DoubtState } from './logic';

const doubt: GameDefinition<DoubtState, DoubtAction> = {
  ...findGame('doubt')!,
  rules: doubtRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [CPU_OPTION],
  howTo:
    'The required rank climbs each turn: A, 2, 3 … K, then A again. On your turn, put 1–4 cards face down claiming they are that rank — true or not. Anyone may call “Doubt!”: if the claim was a lie the player takes the whole pile, if it was true the doubter does. Empty your hand (and survive the doubt) to win. Watch for hesitation…',
};
export default doubt;
