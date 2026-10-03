export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

/** Why an item failed, which decides whether trying again can ever help. */
export type SyncErrorClass =
  /** Network, timeout or 5xx — the server may yet accept it. */
  | 'RETRYABLE'
  /** 401/403 — the token, not the payload. Keep the work, stop the queue. */
  | 'AUTH'
  /** 400/422 — the payload is wrong and will be wrong forever. */
  | 'VALIDATION'
  /** 409 — somebody else changed the document; a person decides. */
  | 'CONFLICT'
  /** The app does not know how to process this item at all. */
  | 'UNSUPPORTED';

export type SyncQueueStatus = 'PENDING' | 'IN_FLIGHT' | 'DEAD';

export interface SyncQueueItem {
  id: string;
  module: string;
  action: SyncAction;
  endpoint: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  retryCount: number;
  status: SyncQueueStatus;
  errorClass: SyncErrorClass | null;
  lastError: string | null;
  /** Epoch millis before which this item must not be tried again. */
  nextAttemptAt: number;
  /** The `modified_at` this edit was based on, sent as `If-Unmodified-Since`. */
  precondition: string | null;
  dependsOn?: string | null;
}

/** What a form supplies when queueing work; the queue fills in the rest. */
export type SyncQueueInput = Pick<
  SyncQueueItem,
  'module' | 'action' | 'endpoint' | 'payload'
> & {
  precondition?: string | null;
};
