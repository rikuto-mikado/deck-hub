import { test as base, expect } from '@playwright/test';

/** Fails a test if the page logs an error or throws. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await use(errors);
      expect(errors, 'browser errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Every game in the catalog, in picker order (keep in sync with src/games/registry.ts). */
export const GAMES = [
  'golf',
  'pyramid',
  'tripeaks',
  'klondike',
  'freecell',
  'spider',
  'yukon',
  'aces-up',
  'forty-thieves',
  'clock-solitaire',
  'poker-squares',
  'canfield',
  'monte-carlo',
  'calculation',
  'accordion',
  'crazy-quilt',
  'beleaguered-castle',
  'elevens',
  'osmosis',
  'scoundrel',
  'video-poker',
  'high-low',
  'regicide',
  'baccarat',
  'card-capture',
  'gridcannon',
  'the-emissary',
  'red-dog',
  'blackjack',
  'concentration',
  'old-maid',
  'sevens',
  'daifugo',
  'speed',
  'texas-holdem',
  'hearts',
  'spades',
  'napoleon',
  'page-one',
  'doubt',
  'gin-rummy',
  'war',
  'cribbage',
  'euchre',
  'schnapsen',
  'six-card-golf',
  'cuttle',
  'gops',
  'yaniv',
  'palace',
  'durak',
  'big-two',
  'ninety-nine',
  'oh-hell',
] as const;
