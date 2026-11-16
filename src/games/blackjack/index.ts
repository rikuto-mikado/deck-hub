import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { blackjackRules, type BlackjackAction, type BlackjackState } from './logic';

const blackjack: GameDefinition<BlackjackState, BlackjackAction> = {
  ...findGame('blackjack')!,
  rules: blackjackRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Chips',
  options: [
    {
      id: 'decks',
      label: 'Decks in the shoe',
      choices: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '6', label: '6' },
        { value: '8', label: '8' },
      ],
      default: '6',
    },
    {
      id: 'dealer',
      label: 'Dealer on soft 17',
      choices: [
        { value: 's17', label: 'Stands (S17)' },
        { value: 'h17', label: 'Hits (H17)' },
      ],
      default: 's17',
    },
    {
      id: 'payout',
      label: 'Blackjack pays',
      choices: [
        { value: '3:2', label: '3:2' },
        { value: '6:5', label: '6:5' },
      ],
      default: '3:2',
    },
    {
      id: 'surrender',
      label: 'Late surrender',
      help: 'Give up your first two cards for half your bet back (after the dealer checks for blackjack).',
      choices: [
        { value: 'on', label: 'Allowed' },
        { value: 'off', label: 'Not allowed' },
      ],
      default: 'on',
    },
  ],
  howTo:
    'Get closer to 21 than the dealer without going over. Double on any two cards, including after a split. Split pairs up to four hands; split Aces get one card each. Insurance is offered when the dealer shows an Ace and pays 2:1. The dealer peeks for blackjack with an Ace or ten showing.',
};
export default blackjack;
