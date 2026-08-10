import { apiClient } from './api';

export interface OrgConfig {
  bjr: number;
}

export const orgConfigApi = {
  get: async (): Promise<OrgConfig> => {
    const response = await apiClient.get<OrgConfig>('/orgConfig');
    return response.data;
  },
};
