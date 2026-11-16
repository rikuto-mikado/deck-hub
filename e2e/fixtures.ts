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

export const GAMES = [
  'golf',
  'pyramid',
  'tripeaks',
  'klondike',
  'freecell',
  'spider',
  'scoundrel',
  'video-poker',
  'high-low',
  'blackjack',
  'concentration',
  'old-maid',
  'sevens',
  'daifugo',
  'speed',
] as const;
