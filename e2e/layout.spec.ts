import { GAMES, expect, test } from './fixtures';

/** No page may scroll sideways, at any size. */
async function noSideScroll(page: import('@playwright/test').Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}

test('game picker fits the screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#featured-title')).toBeVisible();
  await expect(page.getByRole('link', { name: /Deal the cards/ })).toBeInViewport();
  await noSideScroll(page);
});

for (const id of GAMES) {
  test(`${id} table fits the screen`, async ({ page }, info) => {
    await page.goto(`/#/play/${id}?seed=3`);
    if (info.project.name === 'phone-portrait') {
      // Touch devices held upright are asked to turn sideways.
      await expect(page.getByRole('dialog', { name: 'Turn your device sideways' })).toBeVisible();
      await page.getByRole('button', { name: 'Play in portrait anyway' }).click();
    }
    await expect(page.locator('.table-surface')).toBeVisible();
    await noSideScroll(page);
    if (info.project.name === 'phone-landscape') {
      const bottom = await page.locator('.table-surface').evaluate((el) => el.getBoundingClientRect().bottom);
      expect(bottom, 'table should fit a phone held sideways').toBeLessThanOrEqual(390);
    }
  });
}
