import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { cuttleRules, type CuttleAction, type CuttleState } from './logic';

const cuttle: GameDefinition<CuttleState, CuttleAction> = {
  ...findGame('cuttle')!,
  rules: cuttleRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [CPU_OPTION],
  howTo:
    'Reach 21 points (fewer with Kings: 14, 10, 7, 5). Each turn draw a card or play one: A–10 for points; a number card to scuttle a lower point card of your opponent; A–7 and 9 as one-off effects (tap a card to read it); 8 as Glasses; J to steal a point card; Q to protect your other cards; K to lower your goal. Any one-off can be countered with a 2 — and that counter countered again.',
};
export default cuttle;
