import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Lahan, CreateLahanPayload, UpdateLahanPayload } from '@/types/master-data';

const masterCacheDeps = {
  getUserId: () => useAuthStore.getState().user?.id,
  save: lookupCacheDb.save,
  read: lookupCacheDb.get,
};

export const lahanApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Lahan>> =>
    readThroughCache(masterCacheDeps, 'lahan', params, async () => {
      const response = await apiClient.get<PaginatedResponse<Lahan>>('/lahan', { params });
      return response.data;
    }),
  getById: async (id: string): Promise<Lahan> => {
    const response = await apiClient.get<Lahan>(`/lahan/${id}`);
    return response.data;
  },
  create: async (data: CreateLahanPayload): Promise<Lahan> => {
    const response = await apiClient.post<Lahan>('/lahan', data);
    return response.data;
  },
  update: async (id: string, data: UpdateLahanPayload): Promise<Lahan> => {
    const response = await apiClient.put<Lahan>(`/lahan/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/lahan/${id}`);
  },
};
