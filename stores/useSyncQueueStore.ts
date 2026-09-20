import { create } from 'zustand';
import { syncQueueDb } from '@/services/database';

type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface SyncQueueItem {
  id: string;
  module: string;
  action: SyncAction;
  endpoint: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  retryCount: number;
}

interface SyncQueueStore {
  queue: SyncQueueItem[];
  isProcessing: boolean;
  pendingCount: () => number;
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  incrementRetry: (id: string) => Promise<void>;
  setProcessing: (processing: boolean) => void;
  clearQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

const MAX_RETRIES = 5;

let queueIdCounter = 0;
const generateQueueId = () => `sync_${Date.now()}_${++queueIdCounter}_${Math.random().toString(36).slice(2)}`;

export const useSyncQueueStore = create<SyncQueueStore>((set, get) => ({
  queue: [],
  isProcessing: false,

  pendingCount: () => get().queue.length,

  loadQueue: async () => {
    try {
      const saved = await syncQueueDb.getAll();
      set({ queue: saved });
    } catch {
      // Silent fail — start with empty queue
    }
  },

  addToQueue: async (item) => {
    const newItem = {
      ...item,
      id: generateQueueId(),
      createdAt: Date.now(),
    };
    try {
      await syncQueueDb.add(newItem);
      set((state) => ({
        queue: [
          ...state.queue,
          {
            ...newItem,
            retryCount: 0,
          },
        ],
      }));
    } catch (err) {
      console.error('Failed to add item to SQLite sync queue:', err);
      throw err;
    }
  },

  removeFromQueue: async (id) => {
    try {
      await syncQueueDb.remove(id);
      set((state) => ({
        queue: state.queue.filter((q) => q.id !== id),
      }));
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

  setProcessing: (processing) => set({ isProcessing: processing }),

  clearQueue: async () => {
    try {
      await syncQueueDb.clear();
      set({ queue: [] });
    } catch (err) {
      console.error('Failed to clear SQLite sync queue:', err);
    }
  },
}));

export { MAX_RETRIES };
