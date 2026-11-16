import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { videoPokerRules, type VideoPokerAction, type VideoPokerState } from './logic';

const videoPoker: GameDefinition<VideoPokerState, VideoPokerAction> = {
  ...findGame('video-poker')!,
  name: 'Video Poker (Jacks or Better)',
  rules: videoPokerRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Credits',
  howTo:
    'Pick a bet and deal. Tap cards to hold them, then draw once. A pair of Jacks or better pays. Bet 5 for the big Royal Flush payout.',
};
export default videoPoker;
