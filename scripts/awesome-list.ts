import type { Tag } from '../src/shared/types.ts';

export interface ListEntry {
  title: string;
  url: string;
  description: string;
  category: string;
}

const ENTRY = /^- \[(?<title>[^\]]+)\]\((?<url>[^)\s]+)\)\s+-\s+(?<desc>.+)$/;

/** Parses the "## Games" section of the awesome-ai-built-games README. */
export function parseGames(markdown: string): ListEntry[] {
  const entries: ListEntry[] = [];
  let inGames = false;
  let category = '';
  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      inGames = line.trim() === '## Games';
      continue;
    }
    if (!inGames) continue;
    if (line.startsWith('### ')) {
      category = line.slice(4).trim();
      continue;
    }
    const m = ENTRY.exec(line.trim());
    if (!m?.groups) continue;
    entries.push({
      title: m.groups.title!.trim(),
      url: m.groups.url!,
      description: m.groups.desc!.trim(),
      category,
    });
  }
  return entries;
}

/** Links that point at downloads or source code rather than something playable in a frame. */
export function isBrowserPlayable(url: string): boolean {
  const host = new URL(url).hostname;
  return host !== 'github.com';
}

const KEYBOARD_CATEGORIES = new Set([
  'Action & Shooters',
  'Racing & Vehicles',
  'Adventure & Open Worlds',
  'Arcade & Retro',
]);

/** Best-effort tags from the list's prose. The owner corrects them in admin. */
export function guessTags(entry: ListEntry): Tag[] {
  const text = `${entry.title} ${entry.description}`;
  const tags = new Set<Tag>();
  if (KEYBOARD_CATEGORIES.has(entry.category) || /\btyping\b|arrow keys/i.test(text)) tags.add('keyboard');
  if (/\bmobile\b|\bphone\b|\btouch\b|\btap\b/i.test(text)) tags.add('touch');
  if (/\bclick|\bdraw\b|\bfling\b|\bdrag\b|\bpin\b/i.test(text)) tags.add('mouse');
  if (/\bsounds?\b|\bmusic\b|\bmetal\b/i.test(text)) tags.add('audio');
  if (/multiplayer|co-op|two-player|\bplayers\b|with others|with friends|second local player|online/i.test(text)) {
    tags.add('multiplayer');
  }
  return [...tags];
}
