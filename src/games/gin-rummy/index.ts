import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { ginRules, type GinAction, type GinState } from './logic';

const gin: GameDefinition<GinState, GinAction> = {
  ...findGame('gin-rummy')!,
  rules: ginRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'target',
      label: 'Game to',
      choices: [
        { value: '100', label: '100' },
        { value: '50', label: '50' },
      ],
      default: '100',
    },
    CPU_OPTION,
  ],
  howTo:
    'Ten cards each. Draw from the stock or take the top discard, then discard one. Melds are sets of 3–4 of a rank or runs of 3+ in a suit (Ace low); everything else is deadwood (court cards 10). Knock when your deadwood is 10 or less: you score the difference, after your opponent lays off on your melds. Gin (no deadwood) earns 25 extra; if the defender has as little deadwood as the knocker, it is an undercut worth 25 plus the difference.',
};
export default gin;
