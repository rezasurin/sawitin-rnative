import { QueryClient } from '@tanstack/react-query';
import { processItem } from '@/services/sync-processor';
import { syncQueueDb } from '@/services/database';
import { backoffUntil, classify, isBlocking } from '@/services/sync-errors';
import { currentOwner, MAX_RETRIES } from '@/stores/useSyncQueueStore';
import { syncApi } from '@/services/sync.api';
import { pullMasterDelta } from '@/services/master-cache';
import { lookupCacheDb } from '@/services/database';
import type { SyncErrorClass } from '@/types/sync';
import { latestQueueDocument, queueModulePaths } from './queue-recovery';
import { readHistory } from './operational.service';

// ── Types ────────────────────────────────────────────────────────────

export type SyncPhase = 'idle' | 'pushing' | 'pulling' | 'done' | 'error';

export interface SyncResult {
  pushed: number;
  pushFailed: number;
  deadLettered: number;
  conflicts: number;
  pulled: boolean;
  /** Set when the pass stopped early, which today means the token expired. */
  blockedBy?: SyncErrorClass;
  error?: string;
}

interface PerformSyncParams {
  queryClient: QueryClient;
  onProgress: (phase: SyncPhase, detail: string) => void;
}

/** How many items one pass claims at a time. */
const CLAIM_BATCH = 25;

// ── Sync Orchestrator ────────────────────────────────────────────────

/**
 * The one queue processor.
 *
 * There used to be two — an automatic loop that woke on connectivity and this
 * manual one — interlocked only by a boolean read across async boundaries. Both
 * now come through here, and an item is taken by claiming it in SQLite: a row
 * held under a lease is invisible to any other pass until that lease expires,
 * which also brings back work abandoned by a crash or a force-quit.
 *
 * Items run oldest first. That ordering is the dependency ordering: a create
 * carries its header and details as one item, so nothing in the queue depends
 * on an item behind it.
 */
export async function performSync({
  queryClient,
  onProgress,
}: PerformSyncParams): Promise<SyncResult> {
  let pushed = 0;
  let pushFailed = 0;
  let deadLettered = 0;
  let conflicts = 0;
  let blockedBy: SyncErrorClass | undefined;

  const owner = await currentOwner();
  if (!owner) {
    return { pushed: 0, pushFailed: 0, deadLettered: 0, conflicts: 0, pulled: false, error: 'Belum masuk.' };
  }

  // ── Phase 1: Push ────────────────────────────────────────────────
  let processed = 0;
  let batch = await syncQueueDb.claim(owner, CLAIM_BATCH);
  while (batch.length > 0 && !blockedBy) {
    let index = 0;
    for (; index < batch.length; index++) {
      const item = batch[index];
      processed += 1;
      onProgress('pushing', `Mengunggah ${processed} item...`);
      try {
        const result = await processItem(item);
        await syncQueueDb.complete(item.id, result?.modified_at);
        pushed++;
      } catch (error) {
        const failure = classify(error, item.retryCount, MAX_RETRIES);
        await syncQueueDb.markFailed(item.id, {
          errorClass: failure.errorClass,
          lastError: failure.message,
          nextAttemptAt: failure.dead ? 0 : backoffUntil(item.retryCount),
          dead: failure.dead,
        });
        pushFailed++;
        if (failure.dead) deadLettered++;
        if (failure.errorClass === 'CONFLICT') {
          conflicts++;
          try {
            const module = queueModulePaths[item.module as keyof typeof queueModulePaths];
            const latest = await latestQueueDocument(item);
            if (module && typeof latest.id === 'string') {
              await lookupCacheDb.save(`${owner.userId}:operational:${module}:/${module}/${latest.id}:{}`, latest);
              queryClient.setQueriesData({ predicate: (query) => query.queryKey[0] === module && query.queryKey.includes(latest.id) }, latest);
              // Read history only with read permission; the endpoint remains authoritative.
              if (module !== 'pemakaianKendaraan' && module !== 'tiketPks') {
                const events = await readHistory(module, latest.id);
                queryClient.setQueryData(['operationalHistory', module, latest.id, owner.userId], events);
              }
            }
          } catch { /* Keep the conflict and local payload even if refresh is unavailable. */ }
          await queryClient.invalidateQueries();
        }
        if (isBlocking(failure.errorClass)) {
          // The token, not the payload. Every remaining item would fail the
          // same way, so the rest of the batch is handed back untouched.
          blockedBy = failure.errorClass;
          break;
        }
      }
    }
    if (blockedBy) {
      // Release what this pass claimed but never attempted, so the next pass
      // after a fresh sign-in picks it straight up instead of waiting a lease.
      for (const untouched of batch.slice(index + 1)) {
        await syncQueueDb.release(untouched.id);
      }
      break;
    }
    batch = await syncQueueDb.claim(owner, CLAIM_BATCH);
  }

  // ── Phase 2: Pull ────────────────────────────────────────────────
  onProgress('pulling', 'Mengunduh data terbaru...');

  let pulled = false;
  try {
    await pullMasterDelta(owner.userId, {
      fetchDelta: (since) => syncApi.delta(since),
      readCursor: async (userId) =>
        ((await lookupCacheDb.get(`${userId}:__sync_cursor`)) as string | null) ?? undefined,
      saveCursor: (userId, cursor) => lookupCacheDb.save(`${userId}:__sync_cursor`, cursor),
      invalidateResource: (userId, resource) => lookupCacheDb.clearResource(userId, resource),
    });
    await queryClient.invalidateQueries();
    // Wait briefly for refetches to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));
    pulled = true;
  } catch {
    // Pull failure is non-fatal — cached data still available
    pulled = false;
  }

  // ── Phase 3: Tell the server what this queue looks like ──────────
  try {
    const stats = await syncQueueDb.stats(owner);
    await syncApi.reportTelemetry({
      device_id: owner.deviceId,
      queued: stats.queued,
      pushed,
      failed: pushFailed,
      dead_lettered: stats.dead,
      conflicts,
      oldest_queued_age_seconds: stats.oldestQueuedAgeSeconds,
    });
  } catch {
    // Telemetry is never allowed to fail a sync.
  }

  // ── Done ─────────────────────────────────────────────────────────
  const result: SyncResult = { pushed, pushFailed, deadLettered, conflicts, pulled, blockedBy };
  onProgress('done', formatSyncResult(result));
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function formatSyncResult(result: SyncResult): string {
  const parts: string[] = [];

  if (result.pushed > 0) {
    parts.push(`${result.pushed} data berhasil dikirim`);
  }
  if (result.pushFailed > 0) {
    parts.push(`${result.pushFailed} data gagal dikirim`);
  }
  if (result.deadLettered > 0) {
    parts.push(`${result.deadLettered} perlu ditinjau`);
  }
  if (result.blockedBy === 'AUTH') {
    parts.push('Sesi berakhir, masuk kembali untuk melanjutkan');
  }
  if (result.pushed === 0 && result.pushFailed === 0) {
    parts.push('Tidak ada data tertunda');
  }
  if (result.pulled) {
    parts.push('Data terbaru berhasil diunduh');
  }

  return parts.join('. ') + '.';
}
