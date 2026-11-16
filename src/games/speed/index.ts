import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { speedRules, type SpeedAction, type SpeedState } from './logic';

const speed: GameDefinition<SpeedState, SpeedAction> = {
  ...findGame('speed')!,
  rules: speedRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  options: [{ ...CPU_OPTION, help: 'How quickly the CPU reacts.' }],
  scoreLabel: 'Cards left',
  howTo:
    'No turns, so be quick. Play any of your four cards onto a center pile if it is one rank above or below (K and A connect). Tap to play, or drag to choose the pile. When nobody can move, new center cards are flipped automatically. Empty your cards before the CPU.',
};
export default speed;
