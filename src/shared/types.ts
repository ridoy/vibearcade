import type { TAGS } from '../config.ts';

export type Tag = (typeof TAGS)[number];

export type GameStatus = 'pending' | 'live' | 'dead' | 'removed' | 'rejected';

/** A game as the client sees it. */
export interface Game {
  id: number;
  slug: string;
  url: string;
  title: string;
  creator_handle: string | null;
  tweet_url: string | null;
  description: string | null;
  tags: Tag[];
  embeddable: boolean;
  status: GameStatus;
  is_pick: boolean;
  thumb_url: string | null;
  vote_count: number;
  approved_at: number | null;
}

/** Minimal shape used to build the shuffle bag. */
export interface GameRef {
  id: number;
  slug: string;
  tags: Tag[];
}
