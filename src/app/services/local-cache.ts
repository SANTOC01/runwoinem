interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

/** Reads a timestamped value from localStorage. Returns null when missing, stale or unreadable. */
export function readCache<T>(
  key: string,
  isFresh: (timestamp: number) => boolean,
): { data: T; timestamp: number } | null {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (parsed.data !== undefined && typeof parsed.timestamp === 'number' && isFresh(parsed.timestamp)) {
      return { data: parsed.data, timestamp: parsed.timestamp };
    }
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error reading cache "${key}":`, error);
  }
  return null;
}

export function writeCache<T>(key: string, data: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEnvelope<T>));
  } catch (error) {
    console.error(`Error writing cache "${key}":`, error);
  }
}

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
