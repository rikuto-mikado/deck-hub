import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { emissaryRules, type EmissaryAction, type EmissaryState } from './logic';

const emissary: GameDefinition<EmissaryState, EmissaryAction> = {
  ...findGame('the-emissary')!,
  rules: emissaryRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Fiefdoms',
  options: [
    {
      id: 'goal',
      label: 'Fiefdoms to win',
      choices: [
        { value: '3', label: '3 of 4' },
        { value: '4', label: 'All 4' },
      ],
      default: '3',
    },
  ],
  howTo:
    'Visit four rulers. Each King demands an exact number of the eight tricks, played against the Court with his suit as trump. You must follow suit; the Court always plays to win. Four allies help once per fiefdom: the Scout redraws a card, the Envoy swaps one with the Court, the Edict cancels trump for a trick and the Herald steals the lead.',
};
export default emissary;
