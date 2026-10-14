import { OWNER_X_HANDLE } from '../config.ts';
import { h } from './dom.ts';

// Milestone 1: only the "@ me" path. The form arrives in milestone 5.
export function renderSubmit(root: HTMLElement): void {
  root.replaceChildren(
    h('h1', { class: 'page-title' }, 'Submit a game'),
    h('p', { class: 'lede' }, 'Found a vibe-coded game worth playing? Send it over.'),
    h(
      'a',
      {
        class: 'btn btn-primary btn-large',
        href: `https://x.com/intent/tweet?text=@${encodeURIComponent(OWNER_X_HANDLE)}%20`,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      `@${OWNER_X_HANDLE} on X with the link`,
    ),
  );
}
