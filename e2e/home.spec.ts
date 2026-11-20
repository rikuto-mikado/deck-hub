import { expect, test } from './fixtures';

test.describe('game picker', () => {
  test('shows the whole collection as a gallery, Golf first', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(54);
    await expect(cards.first().getByRole('heading')).toHaveText('Golf');
  });

  test('filters the collection by kind', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByRole('article');
    for (const [kind, count] of [
      ['Solitaire', 19],
      ['Solo & Dungeon', 6],
      ['Casino', 5],
      ['Trick-Taking', 6],
      ['Table & Party', 18],
      ['All', 54],
    ] as const) {
      await page.getByRole('button', { name: kind, exact: true }).click();
      await expect(cards).toHaveCount(count);
    }
  });

  test('plays a game straight from its card', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Play Spider' })).toHaveAttribute('href', '#/play/spider');
    await page.getByRole('link', { name: 'Play Hearts' }).click();
    await expect(page).toHaveURL(/#\/play\/hearts$/);
  });

  test("opens a game's rules from its card without leaving the gallery", async ({ page }) => {
    await page.goto('/');
    const rules = page.getByRole('button', { name: 'Rules for Scoundrel' });
    await rules.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await rules.click();
    const dialog = page.getByRole('dialog', { name: 'Scoundrel' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Zach Gage and Kurt Bieg')).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(rules).toBeFocused();
  });

  test('remembers the chosen theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
