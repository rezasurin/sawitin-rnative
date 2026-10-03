import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { performSync } from '@/services/sync.service';

export { processItem, uploadAndCheckpoint } from '@/services/sync-processor';

/**
 * Sync automatically when connectivity returns.
 *
 * This used to run its own loop over the queue while `useSync` ran a second one
 * for the manual button, interlocked only by a zustand boolean read across
 * async boundaries — so two passes could hold the same item. Both now call the
 * one processor in `sync.service.ts`, which claims each row under a lease in
 * SQLite; a row another pass holds is simply invisible here.
 *
 * The ref below is a cheap local guard against React re-entering this effect.
 * It is not the mutual exclusion — the lease is.
 */
export function useSyncProcessor() {
  const queryClient = useQueryClient();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const { queue, isProcessing, setProcessing, loadQueue, pendingCount } = useSyncQueueStore();
  const processingRef = useRef(false);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!isOnline || pendingCount() === 0 || isProcessing || processingRef.current) return;

    async function processQueue() {
      processingRef.current = true;
      setProcessing(true);
      try {
        await performSync({ queryClient, onProgress: () => {} });
        await loadQueue();
      } finally {
        setProcessing(false);
        processingRef.current = false;
      }
    }

    void processQueue();
  }, [isOnline, queue, isProcessing, setProcessing, loadQueue, pendingCount, queryClient]);

  return { pendingCount: pendingCount(), isProcessing };
}
