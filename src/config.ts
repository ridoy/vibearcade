// All tunable constants live here. Shared by the client, the Worker and scripts.

export const SITE_NAME = 'Vibe Arcade';

/** X handle (without @) that people can mention to suggest a game. */
export const OWNER_X_HANDLE = 'YOUR_HANDLE';

/** Public origin of the deployed site. Used when checking CSP frame-ancestors. */
export const SITE_ORIGIN = 'https://vibe-arcade.example.com';

export const TAGS = [
  'keyboard',
  'touch',
  'mouse',
  'audio',
  'multiplayer',
  'ai-powered',
  'desktop-only',
] as const;

export const SHUFFLE = {
  /** ai-powered games may cost their creator money per play, so keep them out of shuffle. */
  excludeAiPowered: true,
  /** On touch / narrow screens, only shuffle touch games if at least this many exist. */
  minTouchGames: 5,
  mobileMaxWidthPx: 640,
} as const;

export const PLAYER = {
  loadTimeoutMs: 15_000,
} as const;

/** Popular score = votes / ((age_hours + ageOffsetHours) ^ decayExponent). */
export const POPULAR = {
  decayExponent: 1.5,
  ageOffsetHours: 2,
} as const;

export const HEALTH = {
  fetchTimeoutMs: 10_000,
  failsBeforeDead: 3,
  passesToRevive: 2,
  minTitleSimilarity: 0.5,
  reportsToPull: 3,
  reportWindowDays: 7,
  titleDenylist: [
    'domain for sale',
    'parked',
    'buy this domain',
    'casino',
    '404',
    'not found',
    'deployment not found',
    'page not found',
  ],
} as const;
