import { lazy } from 'react';
import type { GameDefinition } from '@/core/types/game';
import { findGame } from '../registry';
import { regicideRules, type RegicideAction, type RegicideState } from './logic';

const regicide: GameDefinition<RegicideState, RegicideAction> = {
  ...findGame('regicide')!,
  rules: regicideRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Defeated',
  howTo:
    'Defeat 4 Jacks (20 HP, 10 attack), 4 Queens (30, 15) and 4 Kings (40, 20). Attack with one card, an Ace plus one card, or 2–4 equal number cards totalling 10 or less. Suits add powers unless the royal shares that suit: ♥ heals the tavern from the discard, ♦ draws, ♣ doubles damage, ♠ shields against attacks. If the royal survives, discard cards worth at least its attack. An exact kill puts the royal on top of your tavern deck. Two Jesters refill your hand to eight.',
};
export default regicide;
