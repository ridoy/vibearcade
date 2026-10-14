import { SITE_NAME } from '../config.ts';
import type { Game } from '../shared/types.ts';
import { h, icon, ICONS } from './dom.ts';

export interface HeaderActions {
  shuffle(): void;
  back(): void;
  forward(): void;
  copyLink(): void;
}

/**
 * The 48px bar. On wide screens everything is inline; under 640px only the
 * icon wordmark, Shuffle and the ⋯ menu stay, and the menu carries the rest.
 */
export class Header {
  readonly el: HTMLElement;
  readonly menu: HTMLElement;
  private readonly shuffleBtn: HTMLButtonElement;
  private readonly backBtns: HTMLButtonElement[] = [];
  private readonly forwardBtns: HTMLButtonElement[] = [];
  private readonly credit: HTMLElement;
  private readonly menuCredit: HTMLElement;
  private readonly openLink: HTMLAnchorElement;
  private game: Game | null = null;

  constructor(private readonly actions: HeaderActions) {
    const historyButtons = (extraClass: string) => {
      const back = h(
        'button',
        { class: `btn btn-icon ${extraClass}`, type: 'button', 'aria-label': 'Previous game', title: 'Previous game (Shift+←)', onclick: () => actions.back() },
        icon(ICONS.back),
      );
      const forward = h(
        'button',
        { class: `btn btn-icon ${extraClass}`, type: 'button', 'aria-label': 'Next game in history', title: 'Next game in history', onclick: () => actions.forward() },
        icon(ICONS.forward),
      );
      this.backBtns.push(back);
      this.forwardBtns.push(forward);
      return [back, forward];
    };

    this.shuffleBtn = h(
      'button',
      { class: 'btn btn-primary shuffle', type: 'button', title: 'Shuffle (Shift+→)', onclick: () => this.onShuffle() },
      icon(ICONS.dice),
      h('span', { class: 'shuffle-label' }, 'Shuffle'),
    );

    this.credit = h('div', { class: 'credit wide-only' });
    this.menuCredit = h('div', { class: 'menu-credit narrow-only' });
    this.openLink = h(
      'a',
      { class: 'menu-item game-only', role: 'menuitem', target: '_blank', rel: 'noopener noreferrer', href: '#' },
      'Open in new tab ↗',
    );

    this.menu = h(
      'div',
      { class: 'menu', id: 'header-menu', popover: 'auto', role: 'menu' },
      this.menuCredit,
      h('div', { class: 'menu-row narrow-only game-only' }, ...historyButtons('')),
      this.openLink,
      h(
        'button',
        { class: 'menu-item game-only', role: 'menuitem', type: 'button', onclick: () => { this.closeMenu(); actions.copyLink(); } },
        'Copy link',
      ),
      h('a', { class: 'menu-item narrow-only', role: 'menuitem', href: '/browse', 'data-link': true }, 'Browse'),
      h('a', { class: 'menu-item narrow-only', role: 'menuitem', href: '/submit', 'data-link': true }, 'Submit a game'),
    );
    this.menu.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a')) this.closeMenu();
    });

    this.el = h(
      'header',
      { class: 'bar' },
      h(
        'a',
        { class: 'wordmark', href: '/browse', 'data-link': true, 'aria-label': `${SITE_NAME}: browse all games` },
        h('span', { class: 'wide-only' }, SITE_NAME),
        h('span', { class: 'narrow-only', 'aria-hidden': 'true' }, 'VA'),
      ),
      h('div', { class: 'history wide-only game-only' }, ...historyButtons('')),
      this.shuffleBtn,
      this.credit,
      h('div', { class: 'spacer' }),
      h('a', { class: 'btn btn-ghost wide-only', href: '/browse', 'data-link': true }, 'Browse'),
      h(
        'button',
        { class: 'btn btn-icon menu-toggle', type: 'button', popovertarget: 'header-menu', 'aria-label': 'More', 'aria-haspopup': 'menu' },
        icon(ICONS.more),
      ),
      h('a', { class: 'btn btn-secondary wide-only', href: '/submit', 'data-link': true }, 'Submit'),
    );
  }

  setGame(game: Game | null): void {
    this.game = game;
    this.el.classList.toggle('has-game', game !== null);
    this.menu.classList.toggle('has-game', game !== null);
    this.credit.replaceChildren(...(game ? creditParts(game) : []));
    this.menuCredit.replaceChildren(...(game ? creditParts(game) : []));
    if (game) this.openLink.href = game.url;
  }

  setHistory(canBack: boolean, canForward: boolean): void {
    for (const b of this.backBtns) b.disabled = !canBack;
    for (const b of this.forwardBtns) b.disabled = !canForward;
  }

  get currentGame(): Game | null {
    return this.game;
  }

  private onShuffle(): void {
    this.shuffleBtn.classList.remove('rolling');
    void this.shuffleBtn.offsetWidth; // restart the animation
    this.shuffleBtn.classList.add('rolling');
    this.actions.shuffle();
  }

  private closeMenu(): void {
    try {
      this.menu.hidePopover();
    } catch {
      // Already closed.
    }
  }
}

function creditParts(game: Game): (Node | string)[] {
  const parts: (Node | string)[] = [h('span', { class: 'credit-title', title: game.title }, game.title)];
  if (game.creator_handle) {
    parts.push(
      h('span', { class: 'credit-sep', 'aria-hidden': 'true' }, '·'),
      h(
        'a',
        { href: `https://x.com/${game.creator_handle}`, target: '_blank', rel: 'noopener noreferrer' },
        `by @${game.creator_handle}`,
      ),
    );
  }
  if (game.tweet_url) {
    parts.push(
      h('span', { class: 'credit-sep', 'aria-hidden': 'true' }, '·'),
      h('a', { href: game.tweet_url, target: '_blank', rel: 'noopener noreferrer' }, '↗ tweet'),
    );
  }
  return parts;
}
