import { describe, expect, it } from 'vitest';
import { eligibleIds, ShuffleBag } from '../../src/client/shuffle-bag.ts';
import type { GameRef } from '../../src/shared/types.ts';
import { memoryStore, seeded } from './memory-store.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function draw(bag: ShuffleBag, n: number): number[] {
  return Array.from({ length: n }, () => bag.next()!);
}

describe('ShuffleBag', () => {
  it('visits every game once before any repeat', () => {
    const bag = new ShuffleBag(memoryStore(), 'k', seeded(1));
    bag.reconcile(ids(10));
    for (let round = 0; round < 5; round++) {
      expect(new Set(draw(bag, 10)).size).toBe(10);
    }
  });

  it('never repeats a game across a reshuffle', () => {
    for (let seed = 0; seed < 200; seed++) {
      const bag = new ShuffleBag(memoryStore(), 'k', seeded(seed));
      bag.reconcile(ids(3));
      const picks = draw(bag, 30);
      for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    }
  });

  it('persists order and cursor across instances', () => {
    const store = memoryStore();
    const a = new ShuffleBag(store, 'k', seeded(2));
    a.reconcile(ids(6));
    const first = draw(a, 3);
    const b = new ShuffleBag(store, 'k', seeded(99));
    b.reconcile(ids(6));
    const rest = draw(b, 3);
    expect(new Set([...first, ...rest]).size).toBe(6);
  });

  it('drops games that are no longer live and adds new ones to the unplayed part', () => {
    const store = memoryStore();
    const bag = new ShuffleBag(store, 'k', seeded(3));
    bag.reconcile(ids(5));
    const played = draw(bag, 2);
    const gone = [1, 2, 3, 4, 5].find((id) => !played.includes(id))!;
    const eligible = [...ids(5).filter((id) => id !== gone), 6, 7];
    bag.reconcile(eligible);
    const rest = draw(bag, eligible.length - played.filter((id) => id !== gone).length);
    expect(rest).not.toContain(gone);
    expect(new Set([...played.filter((id) => id !== gone), ...rest])).toEqual(new Set(eligible));
  });

  it('does not serve a directly opened game again this round', () => {
    const bag = new ShuffleBag(memoryStore(), 'k', seeded(4));
    bag.reconcile(ids(5));
    bag.markPlayed(3);
    const rest = draw(bag, 4);
    expect(rest).not.toContain(3);
    expect(new Set(rest).size).toBe(4);
  });

  it('recovers from corrupt stored state', () => {
    const store = memoryStore();
    store.set('k', { bag: 'nope', cursor: -4 });
    const bag = new ShuffleBag(store, 'k', seeded(5));
    bag.reconcile(ids(3));
    expect(new Set(draw(bag, 3)).size).toBe(3);
  });

  it('returns null when there is nothing to play', () => {
    const bag = new ShuffleBag(memoryStore(), 'k');
    bag.reconcile([]);
    expect(bag.next()).toBeNull();
  });
});

describe('eligibleIds', () => {
  const refs: GameRef[] = [
    { id: 1, slug: 'a', tags: ['touch'] },
    { id: 2, slug: 'b', tags: ['touch', 'ai-powered'] },
    { id: 3, slug: 'c', tags: ['keyboard'] },
    { id: 4, slug: 'd', tags: ['touch'] },
  ];

  it('excludes ai-powered games when configured', () => {
    expect(eligibleIds(refs, { excludeAiPowered: true, preferTouch: false, minTouchGames: 5 })).toEqual([1, 3, 4]);
    expect(eligibleIds(refs, { excludeAiPowered: false, preferTouch: false, minTouchGames: 5 })).toEqual([1, 2, 3, 4]);
  });

  it('limits to touch games only when enough exist', () => {
    expect(eligibleIds(refs, { excludeAiPowered: true, preferTouch: true, minTouchGames: 2 })).toEqual([1, 4]);
    expect(eligibleIds(refs, { excludeAiPowered: true, preferTouch: true, minTouchGames: 3 })).toEqual([1, 3, 4]);
  });
});
