import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { KelompokLahan, CreateKelompokLahanPayload, UpdateKelompokLahanPayload } from '@/types/master-data';

export const kelompokLahanApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<KelompokLahan>> => readThroughCache({
    getUserId: () => useAuthStore.getState().user?.id,
    save: lookupCacheDb.save, read: lookupCacheDb.get,
  }, 'kelompokLahan', params, async () => {
    const response = await apiClient.get<PaginatedResponse<KelompokLahan>>('/kelompokLahan', { params });
    return response.data;
  }),
  getById: async (id: string): Promise<KelompokLahan> => {
    const response = await apiClient.get<KelompokLahan>(`/kelompokLahan/${id}`);
    return response.data;
  },
  create: async (data: CreateKelompokLahanPayload): Promise<KelompokLahan> => {
    const response = await apiClient.post<KelompokLahan>('/kelompokLahan', data);
    return response.data;
  },
  update: async (id: string, data: UpdateKelompokLahanPayload): Promise<KelompokLahan> => {
    const response = await apiClient.put<KelompokLahan>(`/kelompokLahan/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/kelompokLahan/${id}`);
  },
};
