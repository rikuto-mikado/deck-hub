import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { fortyThievesRules, type FortyThievesAction, type FortyThievesState } from './logic';

const fortyThieves: GameDefinition<FortyThievesState, FortyThievesAction> = {
  ...findGame('forty-thieves')!,
  rules: fortyThievesRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  options: [
    {
      id: 'variant',
      label: 'Variant',
      help: 'Josephine lets you move any same-suit descending run as a unit.',
      choices: [
        { value: 'classic', label: 'Forty Thieves (one card)' },
        { value: 'josephine', label: 'Josephine (runs move)' },
      ],
      default: 'classic',
    },
  ],
  howTo:
    'Two decks: ten columns of four face-up cards, eight foundations and a stock turned one card at a time with no redeal. Build columns down in the same suit, moving one card at a time (Josephine moves runs). Any card fills an empty column.',
};
export default fortyThieves;
