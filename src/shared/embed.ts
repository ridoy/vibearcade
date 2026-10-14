/**
 * Decides from response headers whether a page can be framed by `ourOrigin`.
 * Not embeddable when X-Frame-Options is DENY/SAMEORIGIN, or when CSP
 * frame-ancestors exists and permits neither `*` nor our origin.
 * CSP frame-ancestors takes precedence over X-Frame-Options, as in browsers.
 */
export function isEmbeddable(headers: Headers, ourOrigin: string): boolean {
  const ancestors = frameAncestors(headers.get('content-security-policy'));
  if (ancestors !== null) return ancestors.some((source) => sourceMatches(source, ourOrigin));

  const xfo = headers.get('x-frame-options')?.trim().toLowerCase();
  return xfo !== 'deny' && xfo !== 'sameorigin';
}

/** Sources listed in the first frame-ancestors directive, or null if there is none. */
function frameAncestors(csp: string | null): string[] | null {
  if (!csp) return null;
  // Multiple policies are joined with commas; each must allow the frame, but in
  // practice sites send one, so the first frame-ancestors directive wins.
  for (const directive of csp.split(/[;,]/)) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() === 'frame-ancestors') return sources;
  }
  return null;
}

function sourceMatches(source: string, ourOrigin: string): boolean {
  const s = source.toLowerCase();
  if (s === '*') return true;
  if (s === "'none'" || s === "'self'") return false;

  const origin = new URL(ourOrigin);
  if (s === 'https:' || s === 'http:') return origin.protocol === s;

  const match = /^(?:(https?):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?/.exec(s);
  if (!match) return false;
  const [, scheme, wildcard, host, port] = match;
  if (scheme && `${scheme}:` !== origin.protocol) return false;
  if (port && port !== '*' && port !== (origin.port || (origin.protocol === 'https:' ? '443' : '80'))) {
    return false;
  }
  if (!host) return false;
  return wildcard ? origin.hostname.endsWith(`.${host}`) : origin.hostname === host;
}
