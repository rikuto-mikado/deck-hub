import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { scoundrelRules, type ScoundrelAction, type ScoundrelState } from './logic';

const scoundrel: GameDefinition<ScoundrelState, ScoundrelAction> = {
  ...findGame('scoundrel')!,
  rules: scoundrelRules,
  Board: lazy(() => import('./Board')),
  options: [
    {
      id: 'weapon',
      label: 'Weapon after a kill',
      help: 'Rule texts differ: a used weapon works on monsters lower than its last kill, or lower or equal.',
      choices: [
        { value: 'equal', label: 'Lower or equal' },
        { value: 'lower', label: 'Strictly lower' },
      ],
      default: 'equal',
    },
  ],
  howTo:
    'Clubs and spades are monsters (J=11 … A=14), diamonds are weapons, hearts are potions. Resolve 3 of the 4 cards in each room; the last one stays for the next. A weapon absorbs damage, but after a kill it only works on monsters up to that value. One potion per room. You may avoid a room, but not twice in a row. Scoundrel was designed by Zach Gage and Kurt Bieg.',
};
export default scoundrel;
