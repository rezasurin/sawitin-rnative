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

/** Delta model name -> the resource key the read-through cache stores under. */
const DELTA_RESOURCE_KEYS: Record<string, string[]> = {
  kelompok_lahan: ['kelompokLahan'],
  blok: ['blok'],
  lahan: ['lahan'],
  tph: ['tph'],
  pekerja: ['pekerja'],
  material: ['material'],
  kendaraan: ['kendaraan'],
  supir: ['supir'],
};

export interface DeltaSyncDeps {
  fetchDelta: (since?: string, limit?: number) => Promise<{
    changed: Record<string, unknown[]>;
    cursor: string;
    has_more: boolean;
  }>;
  readCursor: (userId: string) => Promise<string | undefined>;
  saveCursor: (userId: string, cursor: string) => Promise<void>;
  invalidateResource: (userId: string, resource: string) => Promise<void>;
}

/**
 * Incremental master-data pull.
 *
 * Every sync used to refetch all eight master lists. Now one small call asks
 * what has moved since the stored cursor, and only the resources that actually
 * changed are invalidated so their next read refetches them.
 *
 * ponytail: incremental at resource granularity, not row granularity. The cache
 * holds whole response payloads keyed by request params, so applying rows in
 * place would mean understanding every endpoint's envelope. One changed block
 * therefore refetches the block list — still far less than refetching all eight
 * lists every time. Move to a row store if a single list ever grows large
 * enough that refetching it is the cost that matters.
 */
export async function pullMasterDelta(userId: string, deps: DeltaSyncDeps): Promise<string[]> {
  let cursor = await deps.readCursor(userId);
  const invalidated = new Set<string>();

  // Bounded: a device returning after a long absence pages through, but a
  // broken `has_more` must never spin forever.
  for (let page = 0; page < 20; page++) {
    const delta = await deps.fetchDelta(cursor);
    for (const [model, rows] of Object.entries(delta.changed)) {
      if (!rows?.length) continue;
      for (const resource of DELTA_RESOURCE_KEYS[model] ?? []) invalidated.add(resource);
    }
    cursor = delta.cursor;
    if (!delta.has_more) break;
  }

  for (const resource of invalidated) {
    await deps.invalidateResource(userId, resource);
  }
  if (cursor) await deps.saveCursor(userId, cursor);
  return [...invalidated];
}
