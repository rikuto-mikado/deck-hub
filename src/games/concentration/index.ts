import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { concentrationRules, type ConcentrationAction, type ConcentrationState } from './logic';

const concentration: GameDefinition<ConcentrationState, ConcentrationAction> = {
  ...findGame('concentration')!,
  rules: concentrationRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  options: [{ ...CPU_OPTION, help: 'How much of what it has seen the CPU remembers.' }],
  scoreLabel: 'Your pairs',
  howTo:
    'Flip two cards. If they share a rank you keep the pair and go again; otherwise the turn passes. The CPU remembers most, but not all, of what it has seen.',
};
export default concentration;
