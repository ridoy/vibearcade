const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'ref_url',
  'si',
]);

/**
 * Canonical form of a game URL, used for dedupe: lowercase host, no default port,
 * no tracking params, no empty fragment, no trailing slash.
 * Throws if the input is not an http(s) URL.
 */
export function normalizeUrl(input: string): string {
  const url = new URL(input.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Not an http(s) URL: ${input}`);
  }
  url.hostname = url.hostname.toLowerCase();
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  let out = url.toString();
  if (out.endsWith('#')) out = out.slice(0, -1);
  if (url.search === '' && url.hash === '') out = out.replace(/\/+$/, '');
  return out;
}

export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'game';
}

/** Returns `base`, or `base-2`, `base-3`... whichever is not taken. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
