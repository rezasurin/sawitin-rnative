import { apiClient } from './api';

export interface DeltaResponse {
  changed: Record<string, unknown[]>;
  cursor: string;
  has_more: boolean;
  skipped: string[];
}

export interface SyncTelemetry {
  device_id: string;
  app_version?: string;
  queued: number;
  pushed: number;
  failed: number;
  dead_lettered: number;
  conflicts: number;
  oldest_queued_age_seconds?: number;
}

export const syncApi = {
  /** One page of master data changed since `since`; loop while `has_more`. */
  delta: async (since?: string, limit?: number): Promise<DeltaResponse> =>
    (await apiClient.post('/sync/delta', { since, limit })).data,

  /**
   * Counters only. The endpoint rejects any key it does not name, which is what
   * keeps queue contents from leaking off the device — do not add a field here
   * without adding it there first.
   */
  reportTelemetry: async (telemetry: SyncTelemetry): Promise<void> => {
    await apiClient.post('/sync/telemetry', telemetry);
  },
};
