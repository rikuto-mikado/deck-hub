import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { acesUpRules, type AcesUpAction, type AcesUpState } from './logic';

const acesUp: GameDefinition<AcesUpState, AcesUpAction> = {
  ...findGame('aces-up')!,
  rules: acesUpRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Discarded',
  howTo:
    'Tap a top card to discard it when another pile shows a higher card of the same suit (Aces are high). Tap or drag a top card into an empty pile. Tap the stock to deal one card onto each pile. Win when only the four Aces are left.',
};
export default acesUp;
