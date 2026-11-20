import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { gridcannonRules, type GridcannonAction, type GridcannonState } from './logic';

const gridcannon: GameDefinition<GridcannonState, GridcannonAction> = {
  ...findGame('gridcannon')!,
  rules: gridcannonRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Destroyed',
  howTo:
    'Draw a card and place it on an empty square or on a card of equal or lower value. Placing a card on the edge fires the two cards between it and the royal on the opposite side: if they add up to the royal’s armour (J 11, Q 12, K 13) it falls. Kings only count cards of their suit, Queens of their colour. Royals you draw take their place beside the most similar card. Aces sweep a stack back into the deck; Jokers sit on any stack. Destroy all twelve.',
};
export default gridcannon;
