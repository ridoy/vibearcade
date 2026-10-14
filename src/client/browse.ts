import type { Game } from '../shared/types.ts';
import { listGames } from './data.ts';
import { h, thumbBackground } from './dom.ts';

// Milestone 1: a flat grid of every live game. Tabs, tag filters and
// pagination arrive with the API in milestone 2.
export async function renderBrowse(root: HTMLElement): Promise<void> {
  root.replaceChildren(h('h1', { class: 'page-title' }, 'All games'));
  const games = await listGames();
  root.append(h('ul', { class: 'grid' }, ...games.map(card)));
}

function card(game: Game): HTMLElement {
  return h(
    'li',
    { class: 'card' },
    h(
      'a',
      { class: 'card-link', href: `/g/${game.slug}`, 'data-link': true },
      h('div', { class: 'card-thumb', style: `background: ${thumbBackground(game)}` }, game.is_pick && h('span', { class: 'card-pick', 'aria-label': 'Pick' }, '★')),
      h('div', { class: 'card-title' }, game.title),
    ),
    h(
      'div',
      { class: 'card-meta' },
      game.creator_handle && h('span', {}, `@${game.creator_handle}`),
      ...game.tags.map((t) => h('span', { class: 'chip' }, t)),
    ),
  );
}
