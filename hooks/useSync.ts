import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { performSync, formatSyncResult } from '@/services/sync.service';
import type { SyncPhase, SyncResult } from '@/services/sync.service';

/**
 * useSync Hook
 * Provides a manual sync trigger with reactive progress state.
 * Push: sends pending offline queue items to the server.
 * Pull: invalidates React Query cache to refetch fresh data.
 */
export function useSync() {
  const queryClient = useQueryClient();
  const { queue, removeFromQueue, incrementRetry, setProcessing } =
    useSyncQueueStore();

  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [syncDetail, setSyncDetail] = useState('');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const isSyncingRef = useRef(false);

  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (isSyncingRef.current) {
      return { pushed: 0, pushFailed: 0, pulled: false, error: 'Sinkronisasi sedang berjalan.' };
    }

    isSyncingRef.current = true;
    setProcessing(true);

    try {
      const result = await performSync({
        syncQueue: [...queue],
        removeFromQueue,
        incrementRetry,
        queryClient,
        onProgress: (phase, detail) => {
          setSyncPhase(phase);
          setSyncDetail(detail);
        },
      });

      setLastSyncResult(result);
      return result;
    } catch (err) {
      const errorResult: SyncResult = {
        pushed: 0,
        pushFailed: 0,
        pulled: false,
        error: err instanceof Error ? err.message : 'Sinkronisasi gagal.',
      };
      setSyncPhase('error');
      setSyncDetail(errorResult.error!);
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      isSyncingRef.current = false;
      setProcessing(false);
      // Reset to idle after a brief display period
      setTimeout(() => {
        setSyncPhase('idle');
        setSyncDetail('');
      }, 3000);
    }
  }, [queue, removeFromQueue, incrementRetry, queryClient, setProcessing]);

  return {
    triggerSync,
    syncPhase,
    syncDetail,
    lastSyncResult,
    pendingCount: queue.length,
  };
}

export { formatSyncResult };
export type { SyncPhase, SyncResult };
