import { useEffect, useRef } from 'react';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore, MAX_RETRIES } from '@/stores/useSyncQueueStore';
import { processItem } from '@/services/sync-processor';

export { processItem, uploadAndCheckpoint } from '@/services/sync-processor';

export function useSyncProcessor() {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const { queue, isProcessing, setProcessing, removeFromQueue, incrementRetry, loadQueue } =
    useSyncQueueStore();
  const processingRef = useRef(false);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!isOnline || !queue.some((item) => item.retryCount < MAX_RETRIES) || isProcessing || processingRef.current) return;

    async function processQueue() {
      processingRef.current = true;
      setProcessing(true);
      const snapshot = queue.filter((item) => item.retryCount < MAX_RETRIES);

      try {
        for (const item of snapshot) {
          try {
            await processItem(item);
            await removeFromQueue(item.id);
          } catch (error) {
            console.error(`Sync failed for ${item.id}`, error);
            await incrementRetry(item.id);
          }
        }
      } finally {
        setProcessing(false);
        processingRef.current = false;
      }
    }

    void processQueue();
  }, [isOnline, queue, isProcessing, setProcessing, removeFromQueue, incrementRetry]);

  return { pendingCount: queue.length, isProcessing };
}
