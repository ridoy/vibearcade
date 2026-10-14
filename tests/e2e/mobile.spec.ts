import { expect, test } from './fixtures.ts';

test('narrow header keeps wordmark icon, Shuffle and ⋯; the menu holds the rest', async ({ arcade: page }) => {
  await page.goto('/g/game-1');
  const bar = page.locator('header.bar');
  await expect(bar.getByRole('button', { name: 'Shuffle' })).toBeVisible();
  await expect(bar.getByText('VA')).toBeVisible();
  await expect(bar.locator('.credit')).toBeHidden();
  await expect(bar.getByRole('link', { name: 'Submit' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await bar.getByRole('button', { name: 'More' }).click();
  const menu = page.locator('#header-menu');
  await expect(menu.getByText('Game 1')).toBeVisible();
  await expect(menu.getByRole('link', { name: 'by @maker1' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Submit a game' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Browse' }).click();
  await expect(page).toHaveURL(/\/browse$/);
});
