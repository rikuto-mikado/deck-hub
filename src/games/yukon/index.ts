import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { yukonRules, type YukonAction, type YukonState } from './logic';

const yukon: GameDefinition<YukonState, YukonAction> = {
  ...findGame('yukon')!,
  rules: yukonRules,
  Board: lazy(() => import('./Board')),
  scoreLabel: 'Foundation',
  howTo:
    'There is no stock: all 52 cards are on the table. Move any face-up card onto a card one rank higher of the other colour, carrying every card on top of it, in order or not. Only a King (and its load) fills an empty column. Build the foundations up by suit from Ace to King.',
};
export default yukon;
