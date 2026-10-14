import { expect, it } from 'vitest';
import { PlayHistory } from '../../src/client/play-history.ts';
import { memoryStore } from './memory-store.ts';

it('drops forward entries when a new game is visited', () => {
  const h = new PlayHistory(memoryStore(), 'k');
  h.visit('a');
  h.visit('b');
  h.visit('c');
  expect(h.moveTo(1, 'b')).toBe(true);
  expect(h.canForward).toBe(true);
  h.visit('d');
  expect(h.canForward).toBe(false);
  expect([h.at(0), h.at(1), h.at(2)]).toEqual(['a', 'b', 'd']);
});

it('refuses to move to an index that holds a different game', () => {
  const h = new PlayHistory(memoryStore(), 'k');
  h.visit('a');
  expect(h.moveTo(0, 'z')).toBe(false);
  expect(h.moveTo(5, 'a')).toBe(false);
});

it('does not duplicate the current entry', () => {
  const h = new PlayHistory(memoryStore(), 'k');
  expect(h.visit('a')).toBe(0);
  expect(h.visit('a')).toBe(0);
  expect(h.canBack).toBe(false);
});
