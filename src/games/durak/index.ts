import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { durakRules, type DurakAction, type DurakState } from './logic';

const durak: GameDefinition<DurakState, DurakAction> = {
  ...findGame('durak')!,
  rules: durakRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [
    {
      id: 'players',
      label: 'Players',
      choices: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
      default: '3',
    },
    {
      id: 'deck',
      label: 'Deck',
      choices: [
        { value: '36', label: '36 cards (6–A)' },
        { value: '52', label: '52 cards' },
      ],
      default: '36',
    },
    CPU_OPTION,
  ],
  howTo:
    'The bottom card of the stock sets trump. The attacker leads a card; the defender must beat it with a higher card of the same suit or any trump. Attackers may keep throwing in cards of ranks already on the table (up to six). Beat everything and you attack next; give up and you pick up every card on the table. Hands refill to six. The last player left holding cards is the Durak — the fool.',
};
export default durak;
