import { expect, it } from 'vitest';
import { guessTags, isBrowserPlayable, parseGames } from '../../scripts/awesome-list.ts';

const README = `# List

## Contents

- [Games](#games)

## Games

### Arcade & Retro

- [Ophidian](https://ophidian.vercel.app/) - Minimalist Snake with on-screen arrow keys for mobile. Built with Claude · PixiJS.

### Simulation & Strategy

- [Spinlings](https://github.com/416rehman/spinlings) - Collect pixel creatures. Built with Claude.

## Tools & Frameworks

- [viber3d](https://github.com/instructa/viber3d) - A starter kit.
`;

it('parses only the Games section, with categories', () => {
  const games = parseGames(README);
  expect(games.map((g) => [g.title, g.category])).toEqual([
    ['Ophidian', 'Arcade & Retro'],
    ['Spinlings', 'Simulation & Strategy'],
  ]);
  expect(games[0]!.url).toBe('https://ophidian.vercel.app/');
  expect(games[0]!.description).toBe('Minimalist Snake with on-screen arrow keys for mobile. Built with Claude · PixiJS.');
});

it('skips source-code links', () => {
  expect(isBrowserPlayable('https://github.com/416rehman/spinlings')).toBe(false);
  expect(isBrowserPlayable('https://mrdoob.github.io/three-quake/')).toBe(true);
});

it('guesses tags from the description', () => {
  const [ophidian] = parseGames(README);
  expect(guessTags(ophidian!).sort()).toEqual(['keyboard', 'touch']);
});
