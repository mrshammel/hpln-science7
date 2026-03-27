// ============================================
// Data Cache — Home Plus LMS (Phase 6)
// ============================================
// In-memory request-scoped cache for hot data paths.
// Prevents duplicate DB queries within a single request.
//
// Design:
//   - Uses Node.js global scope to persist across module boundaries
//   - Uses WeakRef + FinalizationRegistry pattern isn't needed
//     because Next.js server components already scope per-request
//   - Simple Map with TTL expiration for short-lived caching
//   - All writes invalidate affected keys

const CACHE_TTL_MS = 30_000; // 30 seconds — enough for a single page render

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from cache, or compute and cache it.
 */
export async function cached<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs: number = CACHE_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const value = await compute();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cache.clear();
}

// Periodic cleanup of expired entries (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  }, 60_000);
}
