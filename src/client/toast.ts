import { h } from './dom.ts';

let region: HTMLElement | null = null;

export interface ToastOptions {
  link?: { label: string; href: string };
  durationMs?: number;
}

export function toast(message: string, opts: ToastOptions = {}): void {
  region ??= document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
  const el = h(
    'div',
    { class: 'toast' },
    message,
    opts.link && h('a', { href: opts.link.href, target: '_blank', rel: 'noopener noreferrer' }, opts.link.label),
  );
  region.append(el);
  setTimeout(() => el.remove(), opts.durationMs ?? 4000);
}
