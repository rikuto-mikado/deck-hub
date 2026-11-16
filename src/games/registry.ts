import type { GameDefinition, GameMeta } from '@/core/types/game';
import type { TableTone } from '@/ui/table/Table';

// Games differ in state/action types; the registry only needs to hand a definition
// to the generic <GameScreen/>, which keeps S and A paired internally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDefinition = GameDefinition<any, any>;

export interface CatalogEntry extends GameMeta {
  /** Code-split loader; undefined while the game is not implemented yet. */
  load?: () => Promise<AnyGameDefinition>;
}

/** Each game lives in its own chunk and is only downloaded when played. */
const LOADERS: Record<string, () => Promise<{ default: AnyGameDefinition }>> = {
  golf: () => import('./golf'),
  pyramid: () => import('./pyramid'),
  tripeaks: () => import('./tripeaks'),
  klondike: () => import('./klondike'),
  freecell: () => import('./freecell'),
  spider: () => import('./spider'),
  scoundrel: () => import('./scoundrel'),
  'video-poker': () => import('./video-poker'),
  'high-low': () => import('./high-low'),
  blackjack: () => import('./blackjack'),
  concentration: () => import('./concentration'),
  'old-maid': () => import('./old-maid'),
  sevens: () => import('./sevens'),
  daifugo: () => import('./daifugo'),
  speed: () => import('./speed'),
};

const META: readonly GameMeta[] = [
  // ── Solitaire ──
  {
    id: 'golf',
    name: 'Golf',
    description: 'Clear the tableau by playing cards one higher or lower than the waste.',
    category: 'solitaire',
    players: 1,
    difficulty: 1,
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    description: 'Remove pairs that add up to 13 to dismantle the pyramid.',
    category: 'solitaire',
    players: 1,
    difficulty: 1,
  },
  {
    id: 'tripeaks',
    name: 'TriPeaks',
    description: 'Chain runs of cards to clear three peaks.',
    category: 'solitaire',
    players: 1,
    difficulty: 1,
  },
  {
    id: 'klondike',
    name: 'Klondike',
    description: 'The classic solitaire. Build down in alternating colors.',
    category: 'solitaire',
    players: 1,
    difficulty: 2,
  },
  {
    id: 'freecell',
    name: 'FreeCell',
    description: 'Use four free cells to move every card to the foundations.',
    category: 'solitaire',
    players: 1,
    difficulty: 2,
  },
  {
    id: 'spider',
    name: 'Spider',
    description: 'Build eight same-suit runs from King down to Ace.',
    category: 'solitaire',
    players: 1,
    difficulty: 3,
  },
  // ── Special ──
  {
    id: 'scoundrel',
    name: 'Scoundrel',
    description: 'A roguelike dungeon crawl played one room at a time.',
    category: 'special',
    players: 1,
    difficulty: 2,
  },
  {
    id: 'video-poker',
    name: 'Video Poker',
    description: 'Hold, draw, and make the best poker hand.',
    category: 'special',
    players: 1,
    difficulty: 1,
  },
  {
    id: 'high-low',
    name: 'High-Low',
    description: 'Guess whether the next card is higher or lower.',
    category: 'special',
    players: 1,
    difficulty: 1,
  },
  // ── vs CPU ──
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer by getting closer to 21.',
    category: 'cpu',
    players: 2,
    difficulty: 1,
  },
  {
    id: 'concentration',
    name: 'Concentration',
    description: 'Flip cards and remember where the pairs are.',
    category: 'cpu',
    players: 2,
    difficulty: 1,
  },
  {
    id: 'old-maid',
    name: 'Old Maid',
    description: "Pair off your cards. Don't get stuck with the Joker.",
    category: 'cpu',
    players: 4,
    difficulty: 1,
  },
  {
    id: 'sevens',
    name: 'Sevens',
    description: 'Build out from the sevens in each suit.',
    category: 'cpu',
    players: 4,
    difficulty: 2,
  },
  {
    id: 'daifugo',
    name: 'Daifugo',
    description: 'Play higher cards to be the first to empty your hand.',
    category: 'cpu',
    players: 4,
    difficulty: 3,
  },
  {
    id: 'speed',
    name: 'Speed',
    description: 'A real-time race. No turns, just be fast.',
    category: 'cpu',
    players: 2,
    difficulty: 2,
  },
];

export const CATALOG: readonly CatalogEntry[] = META.map((meta) => {
  const loader = LOADERS[meta.id];
  return loader ? { ...meta, load: () => loader().then((m) => m.default) } : meta;
});

const CASINO = new Set(['blackjack', 'video-poker']);

/** Table colour for a game: navy solitaire, ember special rules, wine casino, forest versus. */
export function toneOf(meta: Pick<GameMeta, 'id' | 'category'>): TableTone {
  if (CASINO.has(meta.id)) return 'wine';
  return meta.category === 'solitaire' ? 'navy' : meta.category === 'special' ? 'ember' : 'forest';
}

/** Roman numeral for a 1-based catalog position, used as each game's plate number. */
export function numeralOf(id: string): string {
  const n = CATALOG.findIndex((g) => g.id === id) + 1;
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '',
    rest = n;
  for (const [v, s] of table)
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  return out;
}

export const CATEGORY_LABEL: Record<GameMeta['category'], string> = {
  solitaire: 'Solitaire',
  special: 'Special rules',
  cpu: 'vs CPU',
};

export function findGame(id: string): CatalogEntry | undefined {
  return CATALOG.find((g) => g.id === id);
}
