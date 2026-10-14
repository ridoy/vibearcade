import { expect, GAMES, mockGames, SHUFFLEABLE, test } from './fixtures.ts';

const slugFromUrl = (url: string) => new URL(url).pathname.replace('/g/', '');

test('"/" redirects to a shuffled game behind a click-to-play overlay', async ({ arcade: page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/g\/game-\d+$/);
  const slug = slugFromUrl(page.url());
  const game = GAMES.find((g) => g.slug === slug)!;
  const action = game.embeddable
    ? page.getByRole('button', { name: 'Play' })
    : page.getByRole('link', { name: 'Play on original site ↗' });
  await expect(action).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('Play mounts a sandboxed iframe, focuses it, and does not shift layout', async ({ arcade: page }) => {
  await page.goto('/g/game-1');
  const stageBefore = await page.locator('#stage').boundingBox();
  await page.getByRole('button', { name: 'Play' }).click();
  const frame = page.locator('iframe.game-frame');
  await expect(frame).toHaveAttribute('src', 'https://game1.test/');
  await expect(frame).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms',
  );
  await expect(frame).toHaveAttribute('allow', 'fullscreen; gamepad; autoplay; clipboard-write');
  await expect(frame).toBeFocused();
  expect(await page.locator('#stage').boundingBox()).toEqual(stageBefore);
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight)).toBe(true);
});

test('switching games 20 times leaves exactly one live iframe', async ({ arcade: page }) => {
  await page.goto('/g/game-1');
  for (let i = 0; i < 20; i++) {
    const play = page.getByRole('button', { name: 'Play' });
    if (await play.isVisible()) await play.click();
    await page.getByRole('button', { name: 'Shuffle' }).click();
  }
  // Land on a playable game and start it.
  while (!(await page.getByRole('button', { name: 'Play' }).isVisible())) {
    await page.getByRole('button', { name: 'Shuffle' }).click();
  }
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  // Old frames are detached, not just hidden, so their audio and loops are gone.
  await expect.poll(() => page.frames().length).toBe(2);
});

test('keys pressed inside the game never reach the arcade', async ({ arcade: page }) => {
  await page.goto('/g/game-2');
  await page.getByRole('button', { name: 'Play' }).click();
  const frame = page.frameLocator('iframe.game-frame');
  await expect(frame.locator('#log')).toBeAttached();
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'w', 'a', 's', 'd', 'Shift+ArrowRight', 'Shift+ArrowLeft']) {
    await page.keyboard.press(key);
  }
  await expect(frame.locator('#log')).toContainText('ArrowRight');
  await expect(page).toHaveURL(/\/g\/game-2$/);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('Shift+→ shuffles and Shift+← goes back when focus is outside the game', async ({ arcade: page }) => {
  await page.goto('/g/game-3');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page).not.toHaveURL(/\/g\/game-3$/);
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(page).toHaveURL(/\/g\/game-3$/);
});

test('shuffle visits every game once and never serves ai-powered games', async ({ arcade: page }) => {
  await page.goto('/');
  const seen = [slugFromUrl(page.url())];
  for (let i = 1; i < SHUFFLEABLE.length * 2; i++) {
    const before = page.url();
    await page.getByRole('button', { name: 'Shuffle' }).click();
    await expect(page).not.toHaveURL(before);
    seen.push(slugFromUrl(page.url()));
  }
  const firstRound = seen.slice(0, SHUFFLEABLE.length);
  expect(new Set(firstRound)).toEqual(new Set(SHUFFLEABLE.map((g) => g.slug)));
  expect(seen).not.toContain('game-9');
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
});

test('header back/forward walk the play history and keep the URL in sync', async ({ arcade: page }) => {
  await page.goto('/g/game-1');
  const back = page.getByRole('button', { name: 'Previous game' }).first();
  const forward = page.getByRole('button', { name: 'Next game in history' }).first();
  await expect(back).toBeDisabled();
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await expect(page).not.toHaveURL(/game-1$/);
  const second = page.url();
  await back.click();
  await expect(page).toHaveURL(/\/g\/game-1$/);
  await expect(page.locator('.credit-title').first()).toHaveText('Game 1');
  await expect(forward).toBeEnabled();
  await forward.click();
  await expect(page).toHaveURL(second);
  await page.goBack();
  await expect(page).toHaveURL(/\/g\/game-1$/);
  await expect(page.locator('.credit-title').first()).toHaveText('Game 1');
});

test('header shows title, creator and tweet links', async ({ arcade: page }) => {
  await page.goto('/g/game-4');
  const credit = page.locator('.bar .credit');
  await expect(credit.getByText('Game 4')).toBeVisible();
  await expect(credit.getByRole('link', { name: 'by @maker4' })).toHaveAttribute('href', 'https://x.com/maker4');
  await expect(credit.getByRole('link', { name: '↗ tweet' })).toHaveAttribute('href', 'https://x.com/maker4/status/4');
});

test('non-embeddable games show a fallback card instead of an iframe', async ({ arcade: page }) => {
  await page.goto('/g/game-7');
  const link = page.getByRole('link', { name: 'Play on original site ↗' });
  await expect(link).toHaveAttribute('href', 'https://game7.test/');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('dead games show a tombstone with no iframe', async ({ arcade: page }) => {
  await page.goto('/g/game-8');
  await expect(page.getByText('This game has gone offline.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
});

test('unknown slugs show a friendly page with Shuffle', async ({ arcade: page }) => {
  await page.goto('/g/no-such-game');
  await expect(page.getByText("This game isn't here (anymore).")).toBeVisible();
  await page.locator('#stage').getByRole('button', { name: 'Shuffle' }).click();
  await expect(page).toHaveURL(/\/g\/game-\d+$/);
});

test('slow games get a gentle open-in-new-tab toast, not a skip', async ({ page }) => {
  await mockGames(page);
  await page.route('https://game5.test/', () => {}); // never responds
  await page.clock.install();
  await page.goto('/g/game-5');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.clock.runFor(15_500);
  await expect(page.getByRole('link', { name: 'Open in new tab?' })).toHaveAttribute('href', 'https://game5.test/');
  await expect(page).toHaveURL(/\/g\/game-5$/);
});

test('everything works when storage throws', async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    }
  });
  await mockGames(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/g\/game-\d+$/);
  const seen = new Set([slugFromUrl(page.url())]);
  for (let i = 1; i < SHUFFLEABLE.length; i++) {
    await page.getByRole('button', { name: 'Shuffle' }).click();
    await expect.poll(() => seen.has(slugFromUrl(page.url()))).toBe(false);
    seen.add(slugFromUrl(page.url()));
  }
  expect(seen.size).toBe(SHUFFLEABLE.length);
});

test('browse lists live games and opens them in the player', async ({ arcade: page }) => {
  await page.goto('/browse');
  const live = GAMES.filter((g) => g.status === 'live');
  await expect(page.locator('.card')).toHaveCount(live.length);
  await page.getByRole('link', { name: 'Game 2' }).click();
  await expect(page).toHaveURL(/\/g\/game-2$/);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});
