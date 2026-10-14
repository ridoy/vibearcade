import { test as base, type Page } from '@playwright/test';
import type { Game, Tag } from '../../src/shared/types.ts';

function game(id: number, extra: Partial<Game> = {}): Game {
  return {
    id,
    slug: `game-${id}`,
    url: `https://game${id}.test/`,
    title: `Game ${id}`,
    creator_handle: `maker${id}`,
    tweet_url: `https://x.com/maker${id}/status/${id}`,
    description: `Fixture game number ${id}.`,
    tags: ['keyboard'] as Tag[],
    embeddable: true,
    status: 'live',
    is_pick: false,
    thumb_url: null,
    vote_count: 0,
    approved_at: 1_700_000_000,
    ...extra,
  };
}

export const GAMES: Game[] = [
  ...Array.from({ length: 6 }, (_, i) => game(i + 1)),
  game(7, { embeddable: false, title: 'Blocked Game' }),
  game(8, { status: 'dead', title: 'Dead Game' }),
  game(9, { tags: ['ai-powered'], title: 'AI Game' }),
];

/** Live games shuffle may serve on desktop (not ai-powered). */
export const SHUFFLEABLE = GAMES.filter((g) => g.status === 'live' && !g.tags.includes('ai-powered'));

// A stand-in game page that logs every key it receives.
const GAME_HTML = `<!doctype html><html><body style="margin:0;background:#123;color:#fff;font:16px monospace">
<div id="log"></div>
<script>
  addEventListener('keydown', (e) => { e.preventDefault(); document.getElementById('log').textContent += e.key + ' '; });
</script></body></html>`;

export async function mockGames(page: Page, games: Game[] = GAMES): Promise<void> {
  await page.route('**/games.json', (route) => route.fulfill({ json: games }));
  await page.route(/^https:\/\/game\d+\.test\//, (route) => route.fulfill({ contentType: 'text/html', body: GAME_HTML }));
}

export const test = base.extend<{ arcade: Page }>({
  arcade: async ({ page }, use) => {
    await mockGames(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
