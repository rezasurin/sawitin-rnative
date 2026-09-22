import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Pekerja, CreatePekerjaPayload, UpdatePekerjaPayload } from '@/types/master-data';

const masterCacheDeps = {
  getUserId: () => useAuthStore.getState().user?.id,
  save: lookupCacheDb.save,
  read: lookupCacheDb.get,
};

export const pekerjaApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Pekerja>> =>
    readThroughCache(masterCacheDeps, 'pekerja', params, async () => {
      const response = await apiClient.get<PaginatedResponse<Pekerja>>('/pekerja', { params });
      return response.data;
    }),
  getById: async (id: string): Promise<Pekerja> => {
    const response = await apiClient.get<Pekerja>(`/pekerja/${id}`);
    return response.data;
  },
  create: async (data: CreatePekerjaPayload): Promise<Pekerja> => {
    const response = await apiClient.post<Pekerja>('/pekerja', data);
    return response.data;
  },
  update: async (id: string, data: UpdatePekerjaPayload): Promise<Pekerja> => {
    const response = await apiClient.put<Pekerja>(`/pekerja/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/pekerja/${id}`);
  },
};
