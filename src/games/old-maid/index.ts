import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { oldMaidRules, type OldMaidAction, type OldMaidState } from './logic';

const oldMaid: GameDefinition<OldMaidState, OldMaidAction> = {
  ...findGame('old-maid')!,
  rules: oldMaidRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  howTo:
    'On your turn, tap a face-down card in the highlighted CPU hand to take it. Matching ranks are discarded automatically. Empty your hand to win; whoever ends up with the Joker loses.',
};
export default oldMaid;
