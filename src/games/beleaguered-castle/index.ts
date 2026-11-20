import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { castleRules, type CastleAction, type CastleState } from './logic';

const castle: GameDefinition<CastleState, CastleAction> = {
  ...findGame('beleaguered-castle')!,
  rules: castleRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  howTo:
    'The four Aces hold the keep in the middle. The other 48 cards stand in eight wings of six, all face up. Only the outermost card of a wing moves: onto a foundation (up by suit), or onto a wing ending one rank higher, whatever the suit. An empty wing takes any card.',
};
export default castle;
