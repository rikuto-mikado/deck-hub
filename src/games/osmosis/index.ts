import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { osmosisRules, type OsmosisAction, type OsmosisState } from './logic';

const osmosis: GameDefinition<OsmosisState, OsmosisAction> = {
  ...findGame('osmosis')!,
  rules: osmosisRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  howTo:
    'The first card starts the top foundation row; the other rows start with cards of that same rank in new suits. The top row takes any card of its suit. A lower row only takes a card of its suit whose rank is already in the row above. Play the top card of each reserve and of the waste; the stock turns three at a time with unlimited redeals.',
};
export default osmosis;
