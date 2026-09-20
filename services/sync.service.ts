import { QueryClient } from '@tanstack/react-query';
import { processItem } from '@/hooks/useSyncProcessor';
import { MAX_RETRIES } from '@/stores/useSyncQueueStore';

// ── Types ────────────────────────────────────────────────────────────

export type SyncPhase = 'idle' | 'pushing' | 'pulling' | 'done' | 'error';

export interface SyncResult {
  pushed: number;
  pushFailed: number;
  pulled: boolean;
  error?: string;
}

interface SyncQueueItem {
  id: string;
  module: string;
  action: string;
  endpoint: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  retryCount: number;
}

interface PerformSyncParams {
  syncQueue: SyncQueueItem[];
  removeFromQueue: (id: string) => Promise<void>;
  incrementRetry: (id: string) => Promise<void>;
  queryClient: QueryClient;
  onProgress: (phase: SyncPhase, detail: string) => void;
}

// ── Sync Orchestrator ────────────────────────────────────────────────

export async function performSync({
  syncQueue,
  removeFromQueue,
  incrementRetry,
  queryClient,
  onProgress,
}: PerformSyncParams): Promise<SyncResult> {
  let pushed = 0;
  let pushFailed = 0;

  // ── Phase 1: Push ────────────────────────────────────────────────
  if (syncQueue.length > 0) {
    onProgress('pushing', `Mengunggah 0/${syncQueue.length} item...`);

    for (let i = 0; i < syncQueue.length; i++) {
      const item = syncQueue[i];
      if (item.retryCount >= MAX_RETRIES) {
        pushFailed++;
        continue;
      }
      onProgress('pushing', `Mengunggah ${i + 1}/${syncQueue.length} item...`);

      try {
        await processItem(item);
        await removeFromQueue(item.id);
        pushed++;
      } catch {
        await incrementRetry(item.id);
        pushFailed++;
      }
    }
  }

  // ── Phase 2: Pull ────────────────────────────────────────────────
  onProgress('pulling', 'Mengunduh data terbaru...');

  let pulled = false;
  try {
    await queryClient.invalidateQueries();
    // Wait briefly for refetches to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));
    pulled = true;
  } catch {
    // Pull failure is non-fatal — cached data still available
    pulled = false;
  }

  // ── Done ─────────────────────────────────────────────────────────
  const result: SyncResult = { pushed, pushFailed, pulled };
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
  if (result.pushed === 0 && result.pushFailed === 0) {
    parts.push('Tidak ada data tertunda');
  }
  if (result.pulled) {
    parts.push('Data terbaru berhasil diunduh');
  }

  return parts.join('. ') + '.';
}
