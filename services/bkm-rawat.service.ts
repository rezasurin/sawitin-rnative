import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmRawat, CreateBkmRawatPayload, UpdateBkmRawatPayload, BkmRawatDetail, CreateBkmRawatDetailPayload, UpdateBkmRawatDetailPayload, BkmRawatLookups } from '@/types/bkm-rawat';
import { rawatLookupCacheDb } from './database';
import { useAuthStore } from '@/stores/useAuthStore';

export const bkmRawatApi = {
  getLookups: async (): Promise<BkmRawatLookups> => {
    const cacheKey = useAuthStore.getState().user?.id;
    try {
      const response = await apiClient.get<BkmRawatLookups>('/bkmRawat/lookups');
      if (cacheKey) await rawatLookupCacheDb.save(cacheKey, response.data as unknown as Record<string, unknown>);
      return response.data;
    } catch (error) {
      const cached = cacheKey ? await rawatLookupCacheDb.get(cacheKey) : null;
      if (cached) return cached as unknown as BkmRawatLookups;
      throw error;
    }
  },
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<BkmRawat>> => {
    const response = await apiClient.get<PaginatedResponse<BkmRawat>>('/bkmRawat', { params });
    return response.data;
  },
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<BkmRawat>> => {
    const response = await apiClient.post<PaginatedResponse<BkmRawat>>('/bkmRawat/list', params);
    return response.data;
  },
  getById: async (id: string): Promise<BkmRawat> => {
    const response = await apiClient.get<BkmRawat>(`/bkmRawat/${id}`);
    return response.data;
  },
  create: async (data: CreateBkmRawatPayload): Promise<BkmRawat> => {
    const response = await apiClient.post<BkmRawat>('/bkmRawat', data);
    return response.data;
  },
  update: async (id: string, data: UpdateBkmRawatPayload): Promise<BkmRawat> => {
    const response = await apiClient.put<BkmRawat>(`/bkmRawat/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmRawat/${id}`);
  },
  approve: async (id: string): Promise<void> => {
    await apiClient.post(`/bkmRawat/${id}/approve`);
  },
  reject: async (id: string, rejection_note?: string): Promise<BkmRawat> => {
    const response = await apiClient.post<BkmRawat>(`/bkmRawat/${id}/reject`, { rejection_note });
    return response.data;
  },
  getAllDetails: async (params?: ApiListParams): Promise<PaginatedResponse<BkmRawatDetail>> => {
    const response = await apiClient.get<PaginatedResponse<BkmRawatDetail>>('/bkmRawat/detail', { params });
    return response.data;
  },
  addDetail: async (data: CreateBkmRawatDetailPayload): Promise<BkmRawatDetail> => {
    const response = await apiClient.post<BkmRawatDetail>('/bkmRawat/detail', data);
    return response.data;
  },
  updateDetail: async (id: string, data: UpdateBkmRawatDetailPayload): Promise<BkmRawatDetail> => {
    const response = await apiClient.put<BkmRawatDetail>(`/bkmRawat/detail/${id}`, data);
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmRawat/detail/${id}`);
  },
};
