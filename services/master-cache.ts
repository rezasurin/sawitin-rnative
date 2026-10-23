import type { ApiListParams, PaginatedResponse } from '@/types/common';

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

/**
 * Every page of a master list when no page is asked for, so a picker never stops
 * silently at the first page: an estate easily has more TPH or workers than one
 * page holds. A request that names a page gets only that page.
 *
 * ponytail: at most 50 pages, a guard against a broken `totalPages`. Raise it if a
 * list ever outgrows 50 pages of the requested size.
 */
export async function everyPage<T>(
  params: ApiListParams | undefined,
  fetchPage: (params?: ApiListParams) => Promise<PaginatedResponse<T>>
): Promise<PaginatedResponse<T>> {
  if (params?.page) return fetchPage(params);
  const first = await fetchPage(params);
  const data = [...first.data];
  let last = first;
  for (let fetched = 1, page = nextPage(last); page && fetched < 50; fetched++, page = nextPage(last)) {
    last = await fetchPage({ ...params, page });
    data.push(...last.data);
  }
  return { ...first, data };
}

/** The page after this one, or undefined at the end. `has_more` holds even when the count was skipped. */
export const nextPage = ({ meta }: PaginatedResponse<unknown>): number | undefined =>
  !meta ? undefined
    : (meta.has_more ?? (meta.pages != null && meta.page < meta.pages)) ? meta.page + 1 : undefined;

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

/** Where the open restan list lives in the lookup cache. */
export const openRestanKey = (userId: string) => `${userId}:restan:open`;

interface RestanRow { id: string; sudah_dikirim?: boolean }

export interface DeltaSyncDeps {
  fetchDelta: (since?: string, limit?: number) => Promise<{
    changed: Record<string, unknown[]>;
    removed?: Record<string, string[]>;
    cursor: string;
    has_more: boolean;
  }>;
  readCursor: (userId: string) => Promise<string | undefined>;
  saveCursor: (userId: string, cursor: string) => Promise<void>;
  invalidateResource: (userId: string, resource: string) => Promise<void>;
  /**
   * Open restan, kept as rows rather than invalidated: the server reports a
   * collected one only as an id under `removed.restan`, so a refetch could not
   * tell the device what to drop. Null means never pulled.
   */
  readRestan?: (userId: string) => Promise<RestanRow[] | null>;
  saveRestan?: (userId: string, rows: RestanRow[]) => Promise<void>;
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
  let restan = deps.readRestan ? await deps.readRestan(userId) : null;
  // The open-restan snapshot only comes with a pull that has no cursor. A device
  // that already held a cursor before this model existed never got it, so it
  // pulls from the start once rather than miss every restan that has not moved.
  if (deps.readRestan && !restan) cursor = undefined;
  const open = new Map((restan ?? []).map((row) => [row.id, row]));

  // Bounded: a device returning after a long absence pages through, but a
  // broken `has_more` must never spin forever.
  for (let page = 0; page < 20; page++) {
    const delta = await deps.fetchDelta(cursor);
    for (const [model, rows] of Object.entries(delta.changed)) {
      if (!rows?.length) continue;
      for (const resource of DELTA_RESOURCE_KEYS[model] ?? []) invalidated.add(resource);
    }
    for (const row of (delta.changed.restan ?? []) as RestanRow[]) {
      if (row.sudah_dikirim) open.delete(row.id);
      else open.set(row.id, row);
    }
    for (const id of delta.removed?.restan ?? []) open.delete(id);
    cursor = delta.cursor;
    if (!delta.has_more) break;
  }

  for (const resource of invalidated) {
    await deps.invalidateResource(userId, resource);
  }
  await deps.saveRestan?.(userId, [...open.values()]);
  if (cursor) await deps.saveCursor(userId, cursor);
  return [...invalidated];
}
