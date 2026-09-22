import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Tph, CreateTphPayload, UpdateTphPayload } from '@/types/master-data';

const masterCacheDeps = {
  getUserId: () => useAuthStore.getState().user?.id,
  save: lookupCacheDb.save,
  read: lookupCacheDb.get,
};

export const tphApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Tph>> =>
    readThroughCache(masterCacheDeps, 'tph', params, async () => {
      const response = await apiClient.get<PaginatedResponse<Tph>>('/tph', { params });
      return response.data;
    }),
  getById: async (id: string): Promise<Tph> => {
    const response = await apiClient.get<Tph>(`/tph/${id}`);
    return response.data;
  },
  create: async (data: CreateTphPayload): Promise<Tph> => {
    const response = await apiClient.post<Tph>('/tph', data);
    return response.data;
  },
  update: async (id: string, data: UpdateTphPayload): Promise<Tph> => {
    const response = await apiClient.put<Tph>(`/tph/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tph/${id}`);
  },
};
