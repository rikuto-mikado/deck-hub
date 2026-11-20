import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { sixGolfRules, type SixGolfAction, type SixGolfState } from './logic';

const sixGolf: GameDefinition<SixGolfState, SixGolfAction> = {
  ...findGame('six-card-golf')!,
  rules: sixGolfRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Strokes',
  options: [
    {
      id: 'players',
      label: 'Players',
      choices: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
      default: '4',
    },
    {
      id: 'holes',
      label: 'Holes',
      choices: [
        { value: '1', label: '1' },
        { value: '5', label: '5' },
        { value: '9', label: '9' },
      ],
      default: '5',
    },
    CPU_OPTION,
  ],
  howTo:
    'Everyone has a 2×3 grid; turn two cards up to start. On your turn draw from the stock or take the discard, then swap it for any grid card — or throw a stock card away and turn up a face-down card. A matching pair in a column scores 0; otherwise K 0, A 1, 2 −2, J and Q 10, others face value. Once someone has turned every card, everyone else gets one last turn. Lowest total after all holes wins.',
};
export default sixGolf;
