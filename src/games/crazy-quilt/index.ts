import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { crazyQuiltRules, type CrazyQuiltAction, type CrazyQuiltState } from './logic';

const crazyQuilt: GameDefinition<CrazyQuiltState, CrazyQuiltAction> = {
  ...findGame('crazy-quilt')!,
  rules: crazyQuiltRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  howTo:
    'Two decks. One Ace and one King of each suit start eight foundations: Aces build up, Kings build down, by suit. 64 cards form a quilt of upright and sideways cards; a card is free when one of its short ends is open. Play free quilt cards and the top waste card to the foundations; quilt cards may also go on the waste, one up or down in suit. One redeal.',
};
export default crazyQuilt;
