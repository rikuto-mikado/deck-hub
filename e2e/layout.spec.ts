import { GAMES, expect, test } from './fixtures';

/** No page may scroll sideways, at any size. */
async function noSideScroll(page: import('@playwright/test').Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}

/** Held upright, a touch device gets the rotation overlay on every screen, with no way past it. */
async function expectRotateOverlay(page: import('@playwright/test').Page) {
  const overlay = page.getByRole('dialog', { name: 'Turn your device sideways' });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /portrait anyway/i })).toHaveCount(0);
  await noSideScroll(page);
}

test('game picker fits the screen', async ({ page }, info) => {
  await page.goto('/');
  if (info.project.name === 'phone-portrait') return expectRotateOverlay(page);
  await expect(page.getByRole('dialog', { name: 'Turn your device sideways' })).toHaveCount(0);
  // Gallery first: the filters and the first game's plate are on screen without scrolling.
  await expect(page.getByRole('group', { name: 'Filter by kind' })).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Golf', exact: true })).toBeInViewport();
  await noSideScroll(page);
});

for (const id of GAMES) {
  test(`${id} table fits the screen`, async ({ page }, info) => {
    await page.goto(`/#/play/${id}?seed=3`);
    if (info.project.name === 'phone-portrait') return expectRotateOverlay(page);
    await expect(page.locator('.table-surface')).toBeVisible();
    // Measure the real board, not the "Shuffling…" placeholder shown while its chunk loads.
    if (id !== 'video-poker' && id !== 'baccarat' && id !== 'red-dog')
      await expect(page.locator('[data-card-id]').first()).toBeVisible();
    await noSideScroll(page);
    if (info.project.name === 'phone-landscape') {
      const bottom = await page.locator('.table-surface').evaluate((el) => el.getBoundingClientRect().bottom);
      expect(bottom, 'table should fit a phone held sideways').toBeLessThanOrEqual(390);
    }
  });
}
