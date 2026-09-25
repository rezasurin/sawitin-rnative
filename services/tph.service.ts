import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Tph, CreateTphPayload, UpdateTphPayload } from '@/types/master-data';
import { geometryPatch, pointFromLocation } from '@/utils/plantation';
import { useNetworkStore } from '@/stores/useNetworkStore';

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
  /** Master location changes are explicit and online-only, never harvest evidence. */
  updateLocation: async (id: string, location: { longitude: number; latitude: number }): Promise<Tph> => {
    if (!useNetworkStore.getState().isOnline) throw new Error('Simpan lokasi TPH memerlukan internet');
    if (!useAuthStore.getState().hasPermission('mod_tph', 'update')) throw new Error('Tidak memiliki izin mengubah TPH');
    const response = await apiClient.put<Tph>(`/tph/${id}`, geometryPatch(pointFromLocation(location)));
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tph/${id}`);
  },
};
