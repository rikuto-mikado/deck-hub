import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { spiderRules, type SpiderAction, type SpiderState } from './logic';

const spider: GameDefinition<SpiderState, SpiderAction> = {
  ...findGame('spider')!,
  rules: spiderRules,
  Board: lazy(() => import('./Board')),
  options: [
    {
      id: 'suits',
      label: 'Suits',
      choices: [
        { value: '1', label: '1 suit' },
        { value: '2', label: '2 suits' },
        { value: '4', label: '4 suits' },
      ],
      default: '2',
    },
  ],
  howTo:
    'Build down regardless of suit, but only same-suit runs move together. A full King-to-Ace run of one suit is removed. Tap the stock to deal a new row (every column must have a card).',
};
export default spider;
