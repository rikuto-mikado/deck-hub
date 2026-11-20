import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { palaceRules, type PalaceAction, type PalaceState } from './logic';

const palace: GameDefinition<PalaceState, PalaceAction> = {
  ...findGame('palace')!,
  rules: palaceRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [CPU_OPTION],
  howTo:
    'Each player has three blind palace cards, three face-up cards on top and a hand of three; swap hand and face-up cards before play. Play one or more cards of a rank equal to or higher than the pile, drawing back to three while the stock lasts — or pick the pile up. A 2 resets the pile, a 10 or four of a kind burns it (play again), and after a 7 the next card must be 7 or lower. Then play your face-up cards, and finally flip your blind ones. Get out before the others do!',
};
export default palace;
