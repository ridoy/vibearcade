// Milestone 1: games come from the static public/games.json.
// Milestone 2 swaps these functions for /api calls with the same shapes.

import type { Game, GameRef } from '../shared/types.ts';

let all: Promise<Game[]> | null = null;

function load(): Promise<Game[]> {
  all ??= fetch('/games.json').then((res) => {
    if (!res.ok) throw new Error(`games.json: HTTP ${res.status}`);
    return res.json() as Promise<Game[]>;
  });
  return all;
}

export async function listGameRefs(): Promise<GameRef[]> {
  return (await load()).filter((g) => g.status === 'live').map(({ id, slug, tags }) => ({ id, slug, tags }));
}

export async function listGames(): Promise<Game[]> {
  return (await load()).filter((g) => g.status === 'live').sort((a, b) => b.id - a.id);
}

/** Any status, so the player can show tombstones for dead games. */
export async function getGame(slug: string): Promise<Game | null> {
  return (await load()).find((g) => g.slug === slug) ?? null;
}
