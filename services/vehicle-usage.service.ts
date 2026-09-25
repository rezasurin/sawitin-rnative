import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { readThroughCache } from './master-cache';
import { useAuthStore } from '@/stores/useAuthStore';
import { requireOnline } from './operational.service';
import type { ApiListParams, DocumentStatus, PaginatedResponse } from '@/types/common';
import type { Kendaraan, Supir, PemakaianKendaraan, CreatePemakaianKendaraanPayload } from '@/types/vehicle-usage';

const cache = { getUserId: () => useAuthStore.getState().user?.id, save: lookupCacheDb.save, read: lookupCacheDb.get };
export const kendaraanApi = {
  getAll: async (params?: ApiListParams) => readThroughCache(cache, 'kendaraan', params, async () =>
    (await apiClient.get<PaginatedResponse<Kendaraan>>('/kendaraan', { params })).data),
};
export const supirApi = {
  getAll: async (params?: ApiListParams) => readThroughCache(cache, 'supir', params, async () =>
    (await apiClient.get<PaginatedResponse<Supir>>('/supir', { params })).data),
};
export const pemakaianKendaraanApi = {
  getAll: async (params?: ApiListParams) => (await apiClient.get<PaginatedResponse<PemakaianKendaraan>>('/pemakaianKendaraan', { params })).data,
  getById: async (id: string) => (await apiClient.get<PemakaianKendaraan>(`/pemakaianKendaraan/${id}`)).data,
  create: async (payload: CreatePemakaianKendaraanPayload) => (await apiClient.post<PemakaianKendaraan>('/pemakaianKendaraan', payload)).data,
  update: async (id: string, payload: Partial<Omit<CreatePemakaianKendaraanPayload, 'client_request_id'>> & { status?: DocumentStatus }) =>
    (await apiClient.put<PemakaianKendaraan>(`/pemakaianKendaraan/${id}`, payload)).data,
  approve: async (id: string) => { requireOnline(); await apiClient.post(`/pemakaianKendaraan/${id}/approve`); },
  reject: async (id: string, rejection_note: string) => { requireOnline(); await apiClient.post(`/pemakaianKendaraan/${id}/reject`, { rejection_note }); },
  history: async (id: string) => (await apiClient.get<unknown>(`/pemakaianKendaraan/${id}/history`)).data,
};
