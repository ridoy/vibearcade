import './styles.css';
import { SHUFFLE, SITE_NAME } from '../config.ts';
import type { GameRef } from '../shared/types.ts';
import { renderBrowse } from './browse.ts';
import { getGame, listGameRefs } from './data.ts';
import { h, icon, ICONS } from './dom.ts';
import { Header } from './header.ts';
import { PlayHistory } from './play-history.ts';
import { eligibleIds, ShuffleBag } from './shuffle-bag.ts';
import { Stage } from './stage.ts';
import { safeStore } from './storage.ts';
import { renderSubmit } from './submit.ts';
import { toast } from './toast.ts';

type Route =
  | { name: 'shuffle' }
  | { name: 'game'; slug: string }
  | { name: 'browse' }
  | { name: 'submit' }
  | { name: 'missing' };

/** history.state for player entries: index into the PlayHistory stack. */
interface EntryState {
  h: number;
}

function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'shuffle' };
  if (path === '/browse') return { name: 'browse' };
  if (path === '/submit') return { name: 'submit' };
  const game = /^\/g\/([^/]+)$/.exec(path);
  if (game) return { name: 'game', slug: decodeURIComponent(game[1]!) };
  return { name: 'missing' };
}

const preferTouch =
  matchMedia(`(max-width: ${SHUFFLE.mobileMaxWidthPx - 1}px)`).matches || matchMedia('(pointer: coarse)').matches;
const bag = new ShuffleBag(safeStore('local'), `va:bag:v1:${preferTouch ? 'touch' : 'all'}`);
const playHistory = new PlayHistory(safeStore('session'), 'va:history:v1');

let refs: GameRef[] = [];
const ready = listGameRefs().then((r) => {
  refs = r;
  bag.reconcile(
    eligibleIds(r, {
      excludeAiPowered: SHUFFLE.excludeAiPowered,
      preferTouch,
      minTouchGames: SHUFFLE.minTouchGames,
    }),
  );
});

const stage = new Stage();
const page = h('div', { class: 'page' });
const header = new Header({
  shuffle: () => void shuffle(),
  back: () => void stepHistory(-1),
  forward: () => void stepHistory(1),
  copyLink: () => void copyLink(),
});
document.body.replaceChildren(header.el, header.menu, stage.el, page);

let renderToken = 0;

async function shuffle(replace = false): Promise<void> {
  await ready;
  const id = bag.next();
  const ref = refs.find((g) => g.id === id);
  if (!ref) {
    toast('No games to shuffle yet.');
    if (replace) navigate('/browse', true);
    return;
  }
  const index = playHistory.visit(ref.slug);
  writeUrl(`/g/${ref.slug}`, { h: index }, replace);
  await showGame(ref.slug);
}

async function stepHistory(delta: -1 | 1): Promise<void> {
  const index = playHistory.index + delta;
  const slug = playHistory.at(index);
  if (!slug || !playHistory.moveTo(index, slug)) return;
  writeUrl(`/g/${slug}`, { h: index }, false);
  await showGame(slug);
}

async function copyLink(): Promise<void> {
  const game = header.currentGame;
  if (!game) return;
  try {
    await navigator.clipboard.writeText(`${location.origin}/g/${game.slug}`);
    toast('Link copied.');
  } catch {
    toast("Couldn't copy the link.");
  }
}

function writeUrl(path: string, state: EntryState | null, replace: boolean): void {
  if (replace) history.replaceState(state, '', path);
  else history.pushState(state, '', path);
}

function setMode(mode: 'player' | 'page'): void {
  document.documentElement.dataset.mode = mode;
  if (mode === 'page') stage.teardown();
  else page.replaceChildren();
}

async function showGame(slug: string): Promise<void> {
  const token = ++renderToken;
  setMode('player');
  header.setHistory(playHistory.canBack, playHistory.canForward);
  const game = await getGame(slug);
  if (token !== renderToken) return;
  if (!game || (game.status !== 'live' && game.status !== 'dead')) {
    header.setGame(null);
    document.title = SITE_NAME;
    stage.showMissing(shuffleButton());
    return;
  }
  header.setGame(game);
  document.title = `${game.title} · ${SITE_NAME}`;
  if (game.status === 'live') bag.markPlayed(game.id);
  stage.showGame(game);
}

function shuffleButton(): HTMLButtonElement {
  return h(
    'button',
    { class: 'btn btn-primary btn-large', type: 'button', onclick: () => void shuffle() },
    icon(ICONS.dice),
    'Shuffle',
  );
}

/** Renders whatever the current URL points at. `state` is history.state for that entry. */
async function render(state: unknown): Promise<void> {
  const route = parseRoute(location.pathname);
  switch (route.name) {
    case 'shuffle':
      return shuffle(true);
    case 'game': {
      const saved = (state as Partial<EntryState> | null)?.h;
      if (typeof saved !== 'number' || !playHistory.moveTo(saved, route.slug)) {
        history.replaceState({ h: playHistory.visit(route.slug) } satisfies EntryState, '');
      }
      return showGame(route.slug);
    }
    case 'browse':
      renderToken++;
      setMode('page');
      header.setGame(null);
      document.title = `Browse · ${SITE_NAME}`;
      return renderBrowse(page);
    case 'submit':
      renderToken++;
      setMode('page');
      header.setGame(null);
      document.title = `Submit a game · ${SITE_NAME}`;
      return renderSubmit(page);
    case 'missing':
      renderToken++;
      setMode('player');
      header.setGame(null);
      document.title = SITE_NAME;
      stage.showMissing(shuffleButton());
  }
}

function navigate(path: string, replace = false): void {
  writeUrl(path, null, replace);
  void render(null);
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-link]');
  if (!link || link.origin !== location.origin) return;
  e.preventDefault();
  if (link.pathname !== location.pathname) navigate(link.pathname);
});

window.addEventListener('popstate', (e) => void render(e.state));

// Header shortcuts. Keys pressed inside the game iframe never reach this
// document, and we also bail if an iframe or a text field holds focus.
document.addEventListener('keydown', (e) => {
  if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const active = document.activeElement;
  if (active instanceof HTMLIFrameElement || active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
  if (active instanceof HTMLElement && active.isContentEditable) return;
  e.preventDefault();
  if (e.key === 'ArrowRight') void shuffle();
  else void stepHistory(-1);
});

void render(history.state);
