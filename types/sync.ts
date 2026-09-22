export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  module: string;
  action: SyncAction;
  endpoint: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  retryCount: number;
}
