import { apiClient } from './api';
import { HargaTbs, CreateHargaTbsPayload, UpdateHargaTbsPayload } from '@/types/harga-tbs';

export const hargaTbsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<unknown> => {
    const response = await apiClient.post('/hargaTbs/list', params);
    return response.data;
  },
  getLatest: async (): Promise<HargaTbs> => {
    const response = await apiClient.get<HargaTbs>('/hargaTbs/latest');
    return response.data;
  },
  create: async (data: CreateHargaTbsPayload): Promise<HargaTbs> => {
    const response = await apiClient.post<HargaTbs>('/hargaTbs', data);
    return response.data;
  },
  update: async (id: string, data: UpdateHargaTbsPayload): Promise<HargaTbs> => {
    const response = await apiClient.put<HargaTbs>(`/hargaTbs/${id}`, data);
    return response.data;
  },
};
