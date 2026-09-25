import { create } from 'zustand';
import { syncQueueDb, type QueueOwner } from '@/services/database';
import { getDeviceId } from '@/services/device';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SyncQueueInput, SyncQueueItem } from '@/types/sync';
import { isSupportedSyncAction } from '@/utils/sync-support';

interface SyncQueueStore {
  queue: SyncQueueItem[];
  isProcessing: boolean;
  pendingCount: () => number;
  deadCount: () => number;
  addToQueue: (item: SyncQueueInput) => Promise<SyncQueueItem>;
  updatePayload: (id: string, payload: Record<string, unknown>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  incrementRetry: (id: string) => Promise<void>;
  retryItem: (id: string, precondition?: string) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
  setProcessing: (processing: boolean) => void;
  clearQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

const MAX_RETRIES = 5;

let queueIdCounter = 0;
let pendingAdd: Promise<unknown> = Promise.resolve();
function serializeAdd<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingAdd.then(operation, operation);
  pendingAdd = result.catch(() => undefined);
  return result;
}
const generateQueueId = () => `sync_${Date.now()}_${++queueIdCounter}_${Math.random().toString(36).slice(2)}`;

/**
 * Who owns the rows this session may read and send.
 *
 * Every queue operation goes through this. A signed-out app has no owner and
 * therefore no queue: the previous worker's unsent items stay on the handset,
 * invisible and unsendable, until they sign in again and the rows become theirs
 * once more. That is the whole of the shared-device rule.
 */
export async function currentOwner(): Promise<QueueOwner | null> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return { userId, deviceId: await getDeviceId() };
}

export const useSyncQueueStore = create<SyncQueueStore>((set, get) => ({
  queue: [],
  isProcessing: false,

  pendingCount: () => get().queue.filter((item) => item.status !== 'DEAD').length,
  deadCount: () => get().queue.filter((item) => item.status === 'DEAD').length,

  loadQueue: async () => {
    try {
      const owner = await currentOwner();
      set({ queue: owner ? await syncQueueDb.getAll(owner) : [] });
    } catch {
      // Silent fail — start with empty queue
    }
  },

  addToQueue: (item) => serializeAdd(async () => {
    const owner = await currentOwner();
    if (!owner) throw new Error('Cannot queue work while signed out');
    if (!isSupportedSyncAction(item.module, item.action)) {
      throw new Error(`Pekerjaan offline ${item.module}/${item.action} belum didukung.`);
    }

    const payload = item.payload ?? {};
    const status = (payload.data as { status?: string } | undefined)?.status;
    if (status === 'CANCELLED' || /\/(approve|reject)$/.test(item.endpoint)) {
      throw new Error('Keputusan ini hanya tersedia saat online.');
    }
    const businessEdit = item.action === 'UPDATE' && ('header' in payload || 'data' in payload && !status) || item.module.endsWith('_detail');
    if (businessEdit && payload.expectedStatus !== 'DRAFT') {
      throw new Error('Buka dokumen sebagai DRAFT sebelum menyimpan perubahan.');
    }
    const documentId = payload.documentId ?? payload.bkm_rawat_id ?? payload.id;
    const parent = documentId ? [...get().queue].reverse().find((queued) => {
      const previous = queued.payload ?? {};
      return queued.module.replace(/_detail$/, '') === item.module.replace(/_detail$/, '') &&
        (previous.documentId ?? previous.bkm_rawat_id ?? previous.id) === documentId;
    }) : undefined;
    const parentPayload = parent?.payload ?? {};
    if (businessEdit && ((parentPayload.data as { status?: string } | undefined)?.status === 'SUBMITTED' || 'header' in parentPayload && parent?.action === 'UPDATE')) {
      throw new Error('Dokumen sudah menunggu pengiriman. Selesaikan sinkronisasi sebelum menambah perubahan.');
    }

    const newItem: SyncQueueItem = {
      ...item,
      precondition: item.precondition ?? null,
      dependsOn: parent?.id ?? null,
      id: generateQueueId(),
      createdAt: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      errorClass: null,
      lastError: null,
      nextAttemptAt: 0,
    };
    try {
      await syncQueueDb.add({ ...newItem, owner });
      set((state) => ({ queue: [...state.queue, newItem] }));
      return newItem;
    } catch (err) {
      console.error('Failed to add item to SQLite sync queue:', err);
      throw err;
    }
  }),

  updatePayload: async (id, payload) => {
    await syncQueueDb.updatePayload(id, payload);
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, payload } : item)),
    }));
  },

  removeFromQueue: async (id) => {
    try {
      await syncQueueDb.remove(id);
      set((state) => ({ queue: state.queue.filter((q) => q.id !== id) }));
    } catch (err) {
      console.error('Failed to remove item from SQLite sync queue:', err);
    }
  },

  incrementRetry: async (id) => {
    try {
      await syncQueueDb.incrementRetry(id);
      set((state) => ({
        queue: state.queue.map((q) =>
          q.id === id ? { ...q, retryCount: q.retryCount + 1 } : q
        ),
      }));
    } catch (err) {
      console.error('Failed to increment retry in SQLite sync queue:', err);
    }
  },

  /** Put a dead item back in line from the queue screen. */
  retryItem: async (id, precondition) => {
    await syncQueueDb.retryNow(id, precondition);
    await get().loadQueue();
  },

  /** Throw an item away, explicitly, because a person decided to. */
  discardItem: async (id) => {
    if (get().queue.some((item) => item.dependsOn === id)) {
      throw new Error('Perubahan lain bergantung pada item ini. Buang perubahan berikutnya terlebih dahulu.');
    }
    await get().removeFromQueue(id);
  },

  setProcessing: (processing) => set({ isProcessing: processing }),

  clearQueue: async () => {
    try {
      const owner = await currentOwner();
      if (owner) await syncQueueDb.clear(owner);
      set({ queue: [] });
    } catch (err) {
      console.error('Failed to clear SQLite sync queue:', err);
    }
  },
}));

export { MAX_RETRIES };

/**
 * Drop the in-memory queue when someone signs out.
 *
 * The rows stay on disk — unsent work is never destroyed by signing out — but
 * they leave memory so the next person to pick up the handset never sees
 * another worker's pending count. This lives here, as a subscription, rather
 * than in `logout`, so the dependency runs one way: the queue knows about auth,
 * auth knows nothing about the queue, and there is no import cycle.
 */
useAuthStore.subscribe((state, previous) => {
  if (previous.isAuthenticated && !state.isAuthenticated) {
    useSyncQueueStore.setState({ queue: [], isProcessing: false });
  }
});
