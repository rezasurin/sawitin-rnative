import { useEffect, useRef } from 'react';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore, MAX_RETRIES } from '@/stores/useSyncQueueStore';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { bkmCheckerApi } from '@/services/bkm-checker.service';
import { uploadApi } from '@/services/upload.service';
import type { UpdateBkmPanenPayload, CreateBkmPanenPayload, CreateBkmPanenDetailPayload } from '@/types/bkm-panen';
import type { UpdateBkmCheckerPayload, CreateBkmCheckerPayload, CreateBkmCheckerDetailPayload } from '@/types/bkm-checker';

interface BkmPanenQueuePayload {
  header: CreateBkmPanenPayload;
  details: Omit<CreateBkmPanenDetailPayload, 'bkm_panen_id'>[];
}

interface BkmPanenUpdateQueuePayload {
  id: string;
  header: CreateBkmPanenPayload;
  details: (Omit<CreateBkmPanenDetailPayload, 'bkm_panen_id'> & { serverId?: string })[];
  deletedDetailIds: string[];
}

interface BkmCheckerQueuePayload {
  header: CreateBkmCheckerPayload;
  details: Omit<CreateBkmCheckerDetailPayload, 'bkm_checker_id'>[];
}

interface BkmPanenUpdatePayload {
  id: string;
  data: UpdateBkmPanenPayload;
}

interface BkmCheckerUpdatePayload {
  id: string;
  data: UpdateBkmCheckerPayload;
}

async function uploadLocalImages<T extends { foto_url?: string }>(details: T[]): Promise<T[]> {
  return Promise.all(
    details.map(async (d) => {
      if (d.foto_url && d.foto_url.startsWith('file://')) {
        try {
          const { url } = await uploadApi.uploadImage(d.foto_url, 'bkm-panen');
          return { ...d, foto_url: url };
        } catch (err) {
          console.error('Failed to upload image during sync', err);
          throw err;
        }
      }
      return d;
    })
  );
}

async function processItem(item: { module: string; action: string; payload: Record<string, unknown> | null }) {
  if (!item.payload) return;

  if (item.module === 'bkm_panen') {
    if (item.action === 'CREATE') {
      const { header, details } = item.payload as unknown as BkmPanenQueuePayload;
      
      // Upload local images first
      const detailsWithUploadedPhotos = await uploadLocalImages(details);
      
      const panen = await bkmPanenApi.create(header);
      await Promise.all(
        detailsWithUploadedPhotos.map((d) =>
          bkmPanenApi.addDetail({ ...d, bkm_panen_id: panen.id })
        )
      );
      await bkmPanenApi.update(panen.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const payload = item.payload as any;
      if (payload.header && payload.details) {
        // Full Document Update (offline Edit mode save)
        const { id, header, details, deletedDetailIds } = payload as BkmPanenUpdateQueuePayload;

        // 1. Upload local images
        const detailsWithUploadedPhotos = await uploadLocalImages(details);

        // 2. Update header
        await bkmPanenApi.update(id, header);

        // 3. Delete removed details
        if (deletedDetailIds && deletedDetailIds.length > 0) {
          await Promise.all(
            deletedDetailIds.map((delId) => bkmPanenApi.deleteDetail(delId))
          );
        }

        // 4. Upsert details
        await Promise.all(
          detailsWithUploadedPhotos.map((d) => {
            const { serverId, ...cleanPayload } = d as any;
            if (serverId) {
              return bkmPanenApi.updateDetail(serverId, cleanPayload);
            }
            return bkmPanenApi.addDetail({ ...cleanPayload, bkm_panen_id: id });
          })
        );

        // 5. Submit document status
        await bkmPanenApi.update(id, { status: 'SUBMITTED' });
      } else {
        // Simple status update (Revoke, Cancel, Submit offline transitions)
        const { id, data } = payload as BkmPanenUpdatePayload;
        await bkmPanenApi.update(id, data);
      }
    } else if (item.action === 'DELETE') {
      const { id } = item.payload as unknown as { id: string };
      await bkmPanenApi.delete(id);
    }
  }

  if (item.module === 'bkm_checker') {
    if (item.action === 'CREATE') {
      const { header, details } = item.payload as unknown as BkmCheckerQueuePayload;
      const checker = await bkmCheckerApi.create(header);
      await Promise.all(
        details.map((d) =>
          bkmCheckerApi.addDetail({ ...d, bkm_checker_id: checker.id })
        )
      );
      await bkmCheckerApi.update(checker.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as BkmCheckerUpdatePayload;
      await bkmCheckerApi.update(id, data);
    } else if (item.action === 'DELETE') {
      const { id } = item.payload as unknown as { id: string };
      await bkmCheckerApi.delete(id);
    }
  }
}

export function useSyncProcessor() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { queue, isProcessing, setProcessing, removeFromQueue, incrementRetry, loadQueue } =
    useSyncQueueStore();

  const processingRef = useRef(false);

  // Load persisted queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Process queue when online and items exist
  useEffect(() => {
    if (!isOnline || queue.length === 0 || isProcessing || processingRef.current) return;

    let cancelled = false;

    async function processQueue() {
      processingRef.current = true;
      setProcessing(true);

      const snapshot = [...queue];

      for (const item of snapshot) {
        if (cancelled) break;

        try {
          await processItem(item);
          if (!cancelled) removeFromQueue(item.id);
        } catch {
          if (!cancelled) {
            incrementRetry(item.id);
          }
        }
      }

      if (!cancelled) {
        setProcessing(false);
      }
      processingRef.current = false;
    }

    processQueue();

    return () => {
      cancelled = true;
    };
  }, [isOnline, queue, isProcessing, setProcessing, removeFromQueue, incrementRetry]);

  return {
    pendingCount: queue.length,
    isProcessing,
  };
}
