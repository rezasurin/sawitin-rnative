/**
 * Read-through cache for master data used by the field forms.
 *
 * The network is tried first, so a connected device always sees current data.
 * Only when the request fails does a stored copy answer, which is what lets a
 * mandor open a harvest form after restarting the app in a block with no
 * signal. A failure with nothing stored still throws, so the screen shows a
 * real error instead of silently empty pickers.
 *
 * Transactional documents are deliberately not cached here: showing a stale
 * approval offline is worse than showing nothing.
 */
export interface MasterCacheDeps {
  /** Signed-in user; caching is skipped when absent, for example on a login screen. */
  getUserId: () => string | undefined;
  save: (cacheKey: string, payload: unknown) => Promise<void>;
  read: (cacheKey: string) => Promise<unknown | null>;
}

/**
 * Params are part of the key because a screen asking for 200 records must not
 * be served a cached page of 50.
 *
 * ponytail: an exact-key match. A request whose params have never been cached
 * fails offline even when a wider cached page would have answered it. Widen to
 * a nearest-superset lookup if a screen starts varying its params.
 */
export function masterCacheKey(
  userId: string,
  resource: string,
  params?: Record<string, unknown>
): string {
  const entries = Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${userId}:${resource}:${JSON.stringify(entries)}`;
}

export async function readThroughCache<T>(
  deps: MasterCacheDeps,
  resource: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  const userId = deps.getUserId();
  if (!userId) return fetcher();

  const cacheKey = masterCacheKey(userId, resource, params);
  try {
    const fresh = await fetcher();
    await deps.save(cacheKey, fresh);
    return fresh;
  } catch (error) {
    const cached = await deps.read(cacheKey);
    if (cached !== null && cached !== undefined) return cached as T;
    throw error;
  }
}
