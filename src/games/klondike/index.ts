import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { klondikeRules, type KlondikeAction, type KlondikeState } from './logic';

const klondike: GameDefinition<KlondikeState, KlondikeAction> = {
  ...findGame('klondike')!,
  rules: klondikeRules,
  Board: lazy(() => import('./Board')),
  options: [
    {
      id: 'draw',
      label: 'Draw',
      choices: [
        { value: '1', label: 'Draw 1' },
        { value: '3', label: 'Draw 3' },
      ],
      default: '1',
    },
    {
      id: 'passes',
      label: 'Passes through the deck',
      choices: [
        { value: 'unlimited', label: 'Unlimited' },
        { value: '3', label: '3' },
        { value: '1', label: '1' },
      ],
      default: 'unlimited',
    },
    {
      id: 'scoring',
      label: 'Scoring',
      help: 'Standard: +5 waste→column, +10 to foundation, +5 per card turned up, −15 foundation→column, −100 per redeal (Draw 1) or −20 after the third pass (Draw 3). Vegas: pay 52, earn 5 per card on the foundations.',
      choices: [
        { value: 'standard', label: 'Standard' },
        { value: 'vegas', label: 'Vegas' },
      ],
      default: 'standard',
    },
  ],
  howTo:
    'Build columns down in alternating colors and foundations up from Ace by suit. Tap a card to send it to the best spot, or drag it. Only Kings fill empty columns. Tap the stock to turn cards; tap the empty stock to go through the waste again.',
};
export default klondike;
