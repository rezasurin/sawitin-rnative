import { apiClient } from './api';

/**
 * Organization settings as `GET /orgConfig` returns them. Keys other than
 * `bjr` are absent from servers older than the settings API, so every reader
 * goes through `useOrgSetting`, which falls back to `ORG_CONFIG_DEFAULTS`.
 */
export interface OrgConfig {
  bjr: number;
  /** Server rules the app pre-checks; absent from servers older than this field. */
  qr_expiry_ms?: number;
  discrepancy_tolerance_pct?: number;
  brondol_pct_min?: number;
  brondol_pct_max?: number;
  /** true = the organization has its own weighbridge, so its screens are shown. */
  jembatan_timbang?: boolean;
  bjr_band_pct?: number;
  batas_approval_jam?: number;
  tiket_hari?: number;
  timezone?: string;
}

export type OrgSettingKey = Exclude<keyof OrgConfig, 'qr_expiry_ms'>;

/** The server's defaults, used until `/orgConfig` has been fetched once. */
export const ORG_CONFIG_DEFAULTS: Required<Pick<OrgConfig, OrgSettingKey>> = {
  bjr: 15,
  discrepancy_tolerance_pct: 2,
  brondol_pct_min: 3,
  brondol_pct_max: 8,
  jembatan_timbang: false,
  bjr_band_pct: 25,
  batas_approval_jam: 12,
  tiket_hari: 3,
  timezone: 'Asia/Jakarta',
};

export const orgConfigApi = {
  get: async (): Promise<OrgConfig> => {
    const response = await apiClient.get<OrgConfig>('/orgConfig');
    return response.data;
  },
};
