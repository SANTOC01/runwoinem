import { readCache, startOfToday, writeCache } from './local-cache';

describe('local-cache', () => {
  const KEY = 'test_cache_key';
  afterEach(() => localStorage.removeItem(KEY));

  it('round-trips data', () => {
    writeCache(KEY, { a: 1 });
    expect(readCache<{ a: number }>(KEY, () => true)?.data).toEqual({ a: 1 });
  });

  it('returns null and removes the entry when stale', () => {
    writeCache(KEY, [1]);
    expect(readCache(KEY, () => false)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores legacy and corrupt entries', () => {
    localStorage.setItem(KEY, JSON.stringify({ entries: [], timestamp: Date.now() }));
    expect(readCache(KEY, () => true)).toBeNull();
    localStorage.setItem(KEY, '{not json');
    expect(readCache(KEY, () => true)).toBeNull();
  });

  it('startOfToday is midnight', () => {
    const d = new Date(startOfToday());
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });
});
