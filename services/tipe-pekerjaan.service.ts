import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { TipePekerjaan, CreateTipePekerjaanPayload, UpdateTipePekerjaanPayload } from '@/types/master-data';

const masterCacheDeps = {
  getUserId: () => useAuthStore.getState().user?.id,
  save: lookupCacheDb.save,
  read: lookupCacheDb.get,
};

export const tipePekerjaanApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<TipePekerjaan>> =>
    readThroughCache(masterCacheDeps, 'tipePekerjaan', params, async () => {
      const response = await apiClient.get<PaginatedResponse<TipePekerjaan>>('/tipePekerjaan', { params });
      return response.data;
    }),
  getById: async (id: string): Promise<TipePekerjaan> => {
    const response = await apiClient.get<TipePekerjaan>(`/tipePekerjaan/${id}`);
    return response.data;
  },
  create: async (data: CreateTipePekerjaanPayload): Promise<TipePekerjaan> => {
    const response = await apiClient.post<TipePekerjaan>('/tipePekerjaan', data);
    return response.data;
  },
  update: async (id: string, data: UpdateTipePekerjaanPayload): Promise<TipePekerjaan> => {
    const response = await apiClient.put<TipePekerjaan>(`/tipePekerjaan/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tipePekerjaan/${id}`);
  },
};
