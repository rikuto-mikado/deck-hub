import { lazy } from 'react';
import type { GameDefinition, OptionSpec } from '@/core/types/game';
import { findGame } from '../registry';
import { CPU_OPTION } from '../cpuLevel';
import { daifugoRules, type DaifugoAction, type DaifugoState } from './logic';

const onOff = (id: string, label: string, help: string, def: 'on' | 'off' = 'on'): OptionSpec => ({
  id,
  label,
  help,
  choices: [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ],
  default: def,
});

const daifugo: GameDefinition<DaifugoState, DaifugoAction> = {
  ...findGame('daifugo')!,
  rules: daifugoRules,
  Board: lazy(() => import('./Board')),
  undoable: false,
  scoreLabel: 'Points',
  options: [
    CPU_OPTION,
    {
      id: 'rounds',
      label: 'Rounds',
      choices: [
        { value: '3', label: '3' },
        { value: '5', label: '5' },
        { value: '10', label: '10' },
      ],
      default: '5',
    },
    {
      id: 'jokers',
      label: 'Jokers',
      choices: [
        { value: '0', label: '0' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
      ],
      default: '1',
    },
    onOff(
      'exchange',
      'Card exchange',
      'From round 2, Daihinmin gives their 2 best cards to Daifugo and Hinmin gives 1 to Fugo; they give back cards of their choice.',
    ),
    onOff('stairs', 'Stairs (kaidan)', 'Three or more consecutive cards of one suit can be played together.'),
    onOff('eightCut', '8-cut', 'Playing an 8 ends the trick; you lead again.'),
    onOff('revolution', 'Revolution', 'Four of a kind reverses card strength until another revolution.'),
    onOff('stairRevolution', 'Stairs revolution', 'A run of four or more also causes a revolution.', 'off'),
    onOff('jBack', 'J-back', 'Playing a Jack reverses strength until the trick ends.'),
    onOff('lock', 'Suit lock (shibari)', 'Two plays in a row with the same suits lock the trick to those suits.'),
    onOff('spade3', 'Spade 3 counter', 'The ♠3 beats a lone Joker.'),
    onOff(
      'forbiddenFinish',
      'Forbidden finish',
      'Going out on a Joker, 2 (3 in a revolution), 8, or the ♠3 counter drops you to last place.',
    ),
    onOff('miyakoOchi', 'Miyako-ochi', 'If last round’s Daifugo does not finish first, they fall straight to Daihinmin.'),
  ],
  howTo:
    'Cards rank 3 (low) to 2 (high); Jokers are wild or the strongest single. Select a set of one rank or a same-suit run and Play, or pass. Follow with the same kind and number of stronger cards; when everyone passes, the last player leads. Places earn 3/2/1/0 points per round; open Rules to choose which house rules apply.',
};
export default daifugo;
