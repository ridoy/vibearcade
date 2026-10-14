/**
 * Key/value store over Web Storage that never throws. If storage is missing or
 * blocked (private mode, disabled cookies), it silently keeps values in memory.
 */
export interface SafeStore {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
}

export function safeStore(kind: 'local' | 'session'): SafeStore {
  const memory = new Map<string, string>();

  function backing(): Storage | null {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  return {
    get<T>(key: string): T | null {
      let raw: string | null | undefined;
      try {
        raw = backing()?.getItem(key);
      } catch {
        raw = undefined;
      }
      if (raw === undefined || raw === null) raw = memory.get(key) ?? null;
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set(key: string, value: unknown): void {
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      try {
        backing()?.setItem(key, raw);
      } catch {
        // Memory copy above is the fallback.
      }
    },
  };
}
