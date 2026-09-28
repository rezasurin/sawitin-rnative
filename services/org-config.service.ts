import { apiClient } from './api';

export interface OrgConfig {
  bjr: number;
  /** Server rules the app pre-checks; absent from servers older than this field. */
  qr_expiry_ms?: number;
  discrepancy_tolerance_pct?: number;
}

export const orgConfigApi = {
  get: async (): Promise<OrgConfig> => {
    const response = await apiClient.get<OrgConfig>('/orgConfig');
    return response.data;
  },
};
