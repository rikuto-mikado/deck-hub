import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { napoleonRules, type NapoleonAction, type NapoleonState } from './logic';

const napoleon: GameDefinition<NapoleonState, NapoleonAction> = {
  ...findGame('napoleon')!,
  rules: napoleonRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'deals',
      label: 'Deals',
      choices: [
        { value: '3', label: '3' },
        { value: '5', label: '5' },
      ],
      default: '3',
    },
    CPU_OPTION,
  ],
  howTo:
    'Twelve cards each and a four-card kitty. Bid how many of the 20 face cards (10, J, Q, K, A) your side will capture, naming trump (at least 13; ♠ > ♥ > ♦ > ♣ breaks ties). Napoleon takes the kitty, discards four, and names an adjutant card: whoever holds it is the secret partner. The A♠ (Mighty) beats everything except the ♥Q played in the same trick; then the trump Jack and the other Jack of its colour. Follow suit if you can.',
};
export default napoleon;
