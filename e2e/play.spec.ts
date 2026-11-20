import { GAMES, expect, test } from './fixtures';

test.describe('every game', () => {
  for (const id of GAMES) {
    test(`${id} deals without errors`, async ({ page }) => {
      await page.goto(`/#/play/${id}?seed=3`);
      await expect(page.locator('.table-surface')).toBeVisible();
      // Video Poker, Baccarat and Red Dog wait for a bet before dealing.
      if (id === 'video-poker' || id === 'baccarat' || id === 'red-dog')
        await page.getByRole('button', { name: 'Deal', exact: true }).click();
      await expect(page.locator('[data-card-id]').first()).toBeVisible();
    });
  }
});

test.describe('klondike', () => {
  const pileText = (page: import('@playwright/test').Page, id: string) =>
    page.locator(`[data-pile-id="${id}"] [aria-label]:not([aria-label="Face-down card"])`).allInnerTexts();

  test('tap sends a card home, drag moves a card, undo puts it back', async ({ page }) => {
    await page.goto('/#/play/klondike?seed=7');
    await page.getByRole('button', { name: 'Stock' }).click();
    await page.locator('[data-pile-id="waste"] [aria-label="♠A"]').click();
    await expect(page.locator('[data-pile-id="f0"] [aria-label="♠A"]')).toBeVisible();

    const jack = page.locator('[data-pile-id="t0"] [aria-label="♥J"]');
    const queen = page.locator('[data-pile-id="t1"] [aria-label="♣Q"]');
    await jack.dragTo(queen, { targetPosition: { x: 30, y: 60 } });
    await expect(page.locator('[data-pile-id="t1"] [aria-label="♥J"]')).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('[data-pile-id="t0"] [aria-label="♥J"]')).toBeVisible();
    expect(await pileText(page, 't1')).toBeDefined();
  });

  test('hint lights up a move and the moves counter follows play', async ({ page }) => {
    await page.goto('/#/play/klondike?seed=7');
    await page.getByRole('button', { name: 'Hint' }).click();
    await expect(page.locator('.card-hint').first()).toBeVisible();
    await page.getByRole('button', { name: 'Stock' }).click();
    await expect(page.getByText('Moves').locator('..')).toContainText('1');
  });

  test('rules panel switches to Draw 3', async ({ page }) => {
    await page.goto('/#/play/klondike?seed=7');
    await page.getByRole('button', { name: 'Rules' }).click();
    await page.getByRole('button', { name: 'Draw 3' }).click();
    await page.getByRole('button', { name: 'Start new game' }).click();
    await page.getByRole('button', { name: 'Stock' }).click();
    await expect(page.locator('[data-pile-id="waste"] [data-card-id]')).toHaveCount(3);
  });
});

test.describe('opponents', () => {
  test('daifugo CPUs take their turns', async ({ page }) => {
    await page.goto('/#/play/daifugo?seed=5');
    // In this deal you hold the ♦3 and lead: play the weakest card (always legal on a lead).
    await expect(page.getByText('You lead')).toBeVisible();
    // Cards in a hand overlap: tap the visible left edge, as a player would.
    await page
      .getByRole('group', { name: 'Your hand' })
      .getByRole('button')
      .first()
      .click({ position: { x: 6, y: 24 } });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByText(/(Arthur|Elena|Viktor|Chloe|Julian|Clara|Marcus|Sora) (played|passed)/).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('blackjack settles a hand', async ({ page }) => {
    await page.goto('/#/play/blackjack?seed=5');
    await page.getByRole('button', { name: 'Deal', exact: true }).click();
    const noInsurance = page.getByRole('button', { name: 'No insurance' });
    if (await noInsurance.isVisible()) await noInsurance.click();
    const stand = page.getByRole('button', { name: 'Stand' });
    if (await stand.isEnabled()) await stand.click();
    await expect(page.getByRole('button', { name: 'Deal', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('a wrong High-Low guess ends the run with the result dialog', async ({ page }) => {
    await page.goto('/#/play/high-low?seed=5');
    for (let i = 0; i < 52; i++) {
      if (await page.getByRole('dialog').isVisible()) break;
      // Always take the less likely side so the run ends quickly.
      const higher = page.getByRole('button', { name: /Higher/ });
      const lower = page.getByRole('button', { name: /Lower/ });
      const pct = async (b: typeof higher) => Number((await b.innerText()).match(/(\d+)%/)?.[1] ?? 0);
      await ((await pct(higher)) < (await pct(lower)) ? higher : lower).click();
    }
    await expect(page.getByRole('dialog')).toContainText('Game over');
  });
});
