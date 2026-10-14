import { describe, expect, it } from 'vitest';
import { normalizeUrl, slugify, uniqueSlug } from '../../src/shared/url.ts';

describe('normalizeUrl', () => {
  it.each([
    ['https://Example.com/', 'https://example.com'],
    ['https://example.com/game/', 'https://example.com/game'],
    ['https://example.com:443/a?utm_source=x&level=2&fbclid=1', 'https://example.com/a?level=2'],
    ['https://example.com/a?ref=producthunt', 'https://example.com/a'],
    ['https://example.com/#', 'https://example.com'],
    ['https://example.com/play#level-3', 'https://example.com/play#level-3'],
    ['  http://example.com/x  ', 'http://example.com/x'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it('rejects non-http URLs', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow();
    expect(() => normalizeUrl('not a url')).toThrow();
  });
});

describe('slugify', () => {
  it.each([
    ['KÖTTBULLAR METAL', 'kottbullar-metal'],
    ['Fanto\'s Mega-Mart', 'fanto-s-mega-mart'],
    ['Lift & Coast', 'lift-and-coast'],
    ['San Francisco -- The Game', 'san-francisco-the-game'],
    ['20-0', '20-0'],
    ['!!!', 'game'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('dedupes with -2, -3', () => {
    expect(uniqueSlug('a', new Set())).toBe('a');
    expect(uniqueSlug('a', new Set(['a', 'a-2']))).toBe('a-3');
  });
});
