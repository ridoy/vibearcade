// Builds public/games.json from awesome-ai-built-games/README.md.
// Keeps ids and owner edits (tags, picks, credits) for games already in the file,
// and checks each new game's response headers to decide whether it can be framed.
//
// Usage: node scripts/import-awesome.ts [--recheck]

import { readFile, writeFile } from 'node:fs/promises';
import { SITE_ORIGIN } from '../src/config.ts';
import { isEmbeddable } from '../src/shared/embed.ts';
import { normalizeUrl, slugify, uniqueSlug } from '../src/shared/url.ts';
import type { Game } from '../src/shared/types.ts';
import { guessTags, isBrowserPlayable, parseGames, type ListEntry } from './awesome-list.ts';

const README = new URL('../awesome-ai-built-games/README.md', import.meta.url);
const OUT = new URL('../public/games.json', import.meta.url);
const recheck = process.argv.includes('--recheck');

/** `gone` = the page answered 404/410; `unknown` = we couldn't tell (network error, 429, 5xx). */
type Probe = { kind: 'ok'; embeddable: boolean; note: string | null } | { kind: 'gone' | 'unknown'; note: string };

async function probe(url: string, attempt = 1): Promise<Probe> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; VibeArcadeBot/1.0)' },
    });
    await res.body?.cancel();
    if (res.status === 404 || res.status === 410) return { kind: 'gone', note: `HTTP ${res.status}` };
    if (!res.ok) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        return probe(url, attempt + 1);
      }
      return { kind: 'unknown', note: `HTTP ${res.status}` };
    }
    const moved = new URL(res.url).hostname !== new URL(url).hostname;
    return { kind: 'ok', embeddable: isEmbeddable(res.headers, SITE_ORIGIN), note: moved ? `redirects to ${res.url}` : null };
  } catch (err) {
    return { kind: 'unknown', note: `fetch failed: ${(err as Error).message}` };
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function loadExisting(): Promise<Game[]> {
  try {
    return JSON.parse(await readFile(OUT, 'utf8')) as Game[];
  } catch {
    return [];
  }
}

const entries = parseGames(await readFile(README, 'utf8')).filter((e) => isBrowserPlayable(e.url));
const existing = new Map((await loadExisting()).map((g) => [g.url, g]));
let nextId = Math.max(0, ...[...existing.values()].map((g) => g.id)) + 1;
const takenSlugs = new Set([...existing.values()].map((g) => g.slug));
const now = Math.floor(Date.now() / 1000);

const probes = await mapLimit(entries, 4, async (entry: ListEntry) => {
  const url = normalizeUrl(entry.url);
  const old = existing.get(url);
  return old && !recheck ? null : probe(url);
});

const games: Game[] = entries.map((entry, i) => {
  const url = normalizeUrl(entry.url);
  const old = existing.get(url);
  const result = probes[i];
  if (result?.note) console.warn(`${entry.title}: ${result.note}`);
  if (old) {
    return {
      ...old,
      title: entry.title,
      description: entry.description,
      embeddable: result?.kind === 'ok' ? result.embeddable : old.embeddable,
      status: result?.kind === 'ok' ? 'live' : result?.kind === 'gone' ? 'dead' : old.status,
    };
  }
  const slug = uniqueSlug(slugify(entry.title), takenSlugs);
  takenSlugs.add(slug);
  return {
    id: nextId++,
    slug,
    url,
    title: entry.title,
    creator_handle: null,
    tweet_url: null,
    description: entry.description,
    tags: guessTags(entry),
    embeddable: result?.kind === 'ok' ? result.embeddable : true,
    status: result?.kind === 'gone' ? 'dead' : 'live',
    is_pick: false,
    thumb_url: null,
    vote_count: 0,
    approved_at: now,
  };
});

games.sort((a, b) => a.id - b.id);
await writeFile(OUT, `${JSON.stringify(games, null, 2)}\n`);
const blocked = games.filter((g) => !g.embeddable).map((g) => g.title);
console.log(`Wrote ${games.length} games (${blocked.length} not embeddable: ${blocked.join(', ') || 'none'}).`);
