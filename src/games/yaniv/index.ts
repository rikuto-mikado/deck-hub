import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { yanivRules, type YanivAction, type YanivState } from './logic';

const yaniv: GameDefinition<YanivState, YanivAction> = {
  ...findGame('yaniv')!,
  rules: yanivRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    {
      id: 'limit',
      label: 'Game ends above',
      choices: [
        { value: '200', label: '200 points' },
        { value: '100', label: '100 points' },
      ],
      default: '200',
    },
    CPU_OPTION,
  ],
  howTo:
    'Five cards each (Joker 0, A 1, court cards 10). On your turn discard one card, a set of equal ranks, or a run of 3+ in one suit, then draw from the stock or take the first or last card of the previous discard. With 7 or less in hand you may call “Yaniv!” instead: if nobody holds less, everyone else scores their hand. But if someone has as little or less — “Assaf!” — you take 30 plus your hand. Landing on a multiple of 50 knocks 50 off. When someone passes the limit, the lowest score wins.',
};
export default yaniv;
