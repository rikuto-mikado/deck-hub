import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { pageOneRules, type PageOneAction, type PageOneState } from './logic';

const pageOne: GameDefinition<PageOneState, PageOneAction> = {
  ...findGame('page-one')!,
  rules: pageOneRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Cards',
  options: [
    {
      id: 'specials',
      label: 'Special cards',
      help: '2: next player draws 2 · J: skip · A: reverse · Q♠: next player draws 5.',
      choices: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
      default: 'on',
    },
    CPU_OPTION,
  ],
  howTo:
    'Play a card matching the top card’s suit or rank. Eights are wild and let you call the suit. If you cannot (or would rather not) play, draw one card: play it if it fits, or pass. When you play down to your last card, press “Page One!” first — forget, and you draw 2. First to empty their hand wins.',
};
export default pageOne;
