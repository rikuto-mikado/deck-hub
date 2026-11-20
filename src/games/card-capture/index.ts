import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { cardCaptureRules, type CaptureAction, type CaptureState } from './logic';

const cardCapture: GameDefinition<CaptureState, CaptureAction> = {
  ...findGame('card-capture')!,
  rules: cardCaptureRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Royals',
  howTo:
    'Your deck starts with the A–6 of every suit; the dungeon holds 7–K and two Jokers. Capture an enemy with hand cards of its suit worth at least its rank (J 11, Q 12, K 13; a Joker needs 14 of any suits). Captured cards join your deck and hit harder later. Sacrifice an A, 2 or 3 to banish an enemy to the bottom of the dungeon. Ending a turn without doing anything snuffs a torch; capture all 12 royals before your five torches go out.',
};
export default cardCapture;
