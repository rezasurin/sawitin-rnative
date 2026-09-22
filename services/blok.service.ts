import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Blok, CreateBlokPayload, UpdateBlokPayload } from '@/types/master-data';

const masterCacheDeps = {
  getUserId: () => useAuthStore.getState().user?.id,
  save: lookupCacheDb.save,
  read: lookupCacheDb.get,
};

export const blokApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Blok>> =>
    readThroughCache(masterCacheDeps, 'blok', params, async () => {
      const response = await apiClient.get<PaginatedResponse<Blok>>('/blok', { params });
      return response.data;
    }),
  getById: async (id: string): Promise<Blok> => {
    const response = await apiClient.get<Blok>(`/blok/${id}`);
    return response.data;
  },
  create: async (data: CreateBlokPayload): Promise<Blok> => {
    const response = await apiClient.post<Blok>('/blok', data);
    return response.data;
  },
  update: async (id: string, data: UpdateBlokPayload): Promise<Blok> => {
    const response = await apiClient.put<Blok>(`/blok/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/blok/${id}`);
  },
};
