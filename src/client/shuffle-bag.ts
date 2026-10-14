import type { SafeStore } from './storage.ts';
import type { GameRef } from '../shared/types.ts';

interface BagState {
  bag: number[];
  cursor: number;
  last: number | null;
}

export interface EligibilityOptions {
  excludeAiPowered: boolean;
  preferTouch: boolean;
  minTouchGames: number;
}

/** Ids of the games shuffle may pick from, honoring the ai-powered and touch rules. */
export function eligibleIds(refs: readonly GameRef[], opts: EligibilityOptions): number[] {
  let pool = opts.excludeAiPowered ? refs.filter((g) => !g.tags.includes('ai-powered')) : [...refs];
  if (opts.preferTouch) {
    const touch = pool.filter((g) => g.tags.includes('touch'));
    if (touch.length >= opts.minTouchGames) pool = touch;
  }
  return pool.map((g) => g.id);
}

export function fisherYates<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Shuffle bag: every eligible game is played once before any repeats, and a
 * reshuffle never starts with the game that was just played. Persisted so the
 * order survives reloads.
 */
export class ShuffleBag {
  private state: BagState;

  constructor(
    private readonly store: SafeStore,
    private readonly key: string,
    private readonly random: () => number = Math.random,
  ) {
    this.state = parseState(store.get<unknown>(key)) ?? { bag: [], cursor: 0, last: null };
  }

  /** Drops ids that are no longer eligible and slots new ones into the unplayed part. */
  reconcile(eligible: readonly number[]): void {
    const allowed = new Set(eligible);
    const { bag, cursor } = this.state;
    const known = new Set(bag);
    const played = bag.slice(0, cursor).filter((id) => allowed.has(id));
    const remaining = bag.slice(cursor).filter((id) => allowed.has(id));
    for (const id of eligible) {
      if (known.has(id)) continue;
      known.add(id);
      remaining.splice(Math.floor(this.random() * (remaining.length + 1)), 0, id);
    }
    this.state = { bag: [...played, ...remaining], cursor: played.length, last: this.state.last };
    this.save();
  }

  next(): number | null {
    const s = this.state;
    if (s.bag.length === 0) return null;
    if (s.cursor >= s.bag.length) {
      const bag = fisherYates(s.bag, this.random);
      if (bag.length > 1 && bag[0] === s.last) {
        const j = 1 + Math.floor(this.random() * (bag.length - 1));
        [bag[0], bag[j]] = [bag[j]!, bag[0]!];
      }
      s.bag = bag;
      s.cursor = 0;
    }
    const id = s.bag[s.cursor++]!;
    s.last = id;
    this.save();
    return id;
  }

  /** Records a game opened some other way (direct link, browse) so shuffle won't serve it again this round. */
  markPlayed(id: number): void {
    const s = this.state;
    const idx = s.bag.indexOf(id);
    if (idx >= s.cursor) {
      [s.bag[idx], s.bag[s.cursor]] = [s.bag[s.cursor]!, s.bag[idx]!];
      s.cursor++;
    }
    s.last = id;
    this.save();
  }

  private save(): void {
    this.store.set(this.key, this.state);
  }
}

function parseState(raw: unknown): BagState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { bag, cursor, last } = raw as Record<string, unknown>;
  if (!Array.isArray(bag) || !bag.every((n) => Number.isInteger(n))) return null;
  if (typeof cursor !== 'number' || cursor < 0) return null;
  return {
    bag: bag as number[],
    cursor: Math.min(cursor, bag.length),
    last: typeof last === 'number' ? last : null,
  };
}
