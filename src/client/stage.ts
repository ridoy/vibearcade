import { PLAYER } from '../config.ts';
import type { Game } from '../shared/types.ts';
import { h, thumbBackground } from './dom.ts';
import { toast } from './toast.ts';

const SANDBOX =
  'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms';
const ALLOW = 'fullscreen; gamepad; autoplay; clipboard-write';

export function creditLine(game: Game): HTMLElement | null {
  if (!game.creator_handle) return null;
  return h(
    'p',
    { class: 'stage-credit' },
    'by ',
    h(
      'a',
      { href: `https://x.com/${game.creator_handle}`, target: '_blank', rel: 'noopener noreferrer' },
      `@${game.creator_handle}`,
    ),
  );
}

/**
 * The area below the header. Holds at most one game iframe at a time; every
 * render tears down the previous one so audio, game loops and WebGL stop.
 */
export class Stage {
  readonly el = h('main', { class: 'stage', id: 'stage' });
  private iframe: HTMLIFrameElement | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;

  showGame(game: Game): void {
    this.teardown();
    if (game.status === 'dead') return this.showCard(game, 'This game has gone offline.', null);
    if (!game.embeddable) {
      return this.showCard(
        game,
        "This one can't be played inside the arcade.",
        h(
          'a',
          { class: 'btn btn-primary btn-large', href: game.url, target: '_blank', rel: 'noopener noreferrer' },
          'Play on original site ↗',
        ),
      );
    }
    this.mount(game);
  }

  /** "This game isn't here" page, with whatever action the caller wants (usually Shuffle). */
  showMissing(action: HTMLElement): void {
    this.teardown();
    this.el.replaceChildren(
      h(
        'div',
        { class: 'cover cover-plain' },
        h(
          'div',
          { class: 'cover-body' },
          h('h1', { class: 'stage-title' }, "This game isn't here (anymore)."),
          h('p', { class: 'stage-note' }, 'It may have been removed, or the link is wrong.'),
          action,
        ),
      ),
    );
  }

  teardown(): void {
    clearTimeout(this.loadTimer);
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.remove();
      this.iframe = null;
    }
    this.el.replaceChildren();
  }

  private showCard(game: Game, note: string | null, action: HTMLElement | null): void {
    const cover = h(
      'div',
      { class: 'cover' },
      h('div', { class: 'cover-art', style: `background: ${thumbBackground(game)}` }),
      h(
        'div',
        { class: 'cover-body' },
        h('h1', { class: 'stage-title' }, game.title),
        creditLine(game),
        game.description && h('p', { class: 'stage-desc' }, game.description),
        note && h('p', { class: 'stage-note' }, note),
        action,
      ),
    );
    this.el.replaceChildren(cover);
  }

  private mount(game: Game): void {
    this.teardown();
    const iframe = h('iframe', {
      class: 'game-frame',
      title: game.title,
      sandbox: SANDBOX,
      allow: ALLOW,
      referrerpolicy: 'no-referrer-when-downgrade',
      loading: 'eager',
    });
    iframe.addEventListener('load', () => clearTimeout(this.loadTimer), { once: true });
    iframe.src = game.url;
    this.iframe = iframe;
    this.el.replaceChildren(iframe);
    iframe.focus();
    this.loadTimer = setTimeout(() => {
      if (this.iframe === iframe) {
        toast('Taking a while…', { link: { label: 'Open in new tab?', href: game.url }, durationMs: 8000 });
      }
    }, PLAYER.loadTimeoutMs);
  }
}
