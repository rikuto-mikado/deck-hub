import { expect, test } from './fixtures';

test.describe('game picker', () => {
  test('starts on No. I and switches the featured game from the collection', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#featured-title')).toHaveText('Golf');
    await page.getByRole('button', { name: 'Show Spider' }).click();
    await expect(page.locator('#featured-title')).toHaveText('Spider');
    await expect(page.getByRole('link', { name: /Deal the cards/ })).toHaveAttribute('href', '#/play/spider');
  });

  test('filters the collection by kind', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'vs CPU' }).click();
    await expect(page.getByRole('button', { name: /^Show / })).toHaveCount(6);
  });

  test('opens and closes the how-to-play guide', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Show Scoundrel' }).click();
    await page.getByRole('button', { name: /How to play/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Scoundrel' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Zach Gage and Kurt Bieg')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('remembers the chosen theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
