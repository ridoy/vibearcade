import type { SafeStore } from '../../src/client/storage.ts';

export function memoryStore(): SafeStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: <T>(key: string) => (data.has(key) ? (JSON.parse(data.get(key)!) as T) : null),
    set: (key, value) => void data.set(key, JSON.stringify(value)),
  };
}

/** Deterministic PRNG (mulberry32). */
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
