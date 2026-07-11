import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmPanen, CreateBkmPanenPayload, UpdateBkmPanenPayload, BkmPanenDetail, CreateBkmPanenDetailPayload, UpdateBkmPanenDetailPayload } from '@/types/bkm-panen';
import { bkmPanenCacheDb } from './database';

export const bkmPanenApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<BkmPanen>> => {
    try {
      const response = await apiClient.get<PaginatedResponse<BkmPanen>>('/bkmPanen', { params });
      if (response.data && Array.isArray(response.data.data)) {
        bkmPanenCacheDb.saveList(response.data.data).catch((err) => {
          console.warn('Failed to cache BKM Panen list in SQLite:', err);
        });
      }
      return response.data;
    } catch (error) {
      console.log('Network request failed, attempting SQLite cache retrieval for BKM list.');
      try {
        const cachedData = await bkmPanenCacheDb.getAll();
        return {
          data: cachedData,
          pagination: {
            page: params?.page ? Number(params.page) : 1,
            limit: params?.limit ? Number(params.limit) : 20,
            total: cachedData.length,
            totalPages: 1,
          },
        };
      } catch (dbErr) {
        console.error('Failed to read BKM Panen list from SQLite:', dbErr);
        throw error;
      }
    }
  },
  getById: async (id: string): Promise<BkmPanen> => {
    try {
      const response = await apiClient.get<BkmPanen>(`/bkmPanen/${id}`);
      if (response.data) {
        bkmPanenCacheDb.saveList([response.data]).catch((err) => {
          console.warn(`Failed to cache BKM Panen ID ${id} in SQLite:`, err);
        });
      }
      return response.data;
    } catch (error) {
      console.log(`Network request failed, attempting SQLite cache retrieval for BKM ID: ${id}`);
      try {
        const cached = await bkmPanenCacheDb.getById(id);
        if (cached) return cached;
      } catch (dbErr) {
        console.error('Failed to read BKM Panen details from SQLite:', dbErr);
      }
      throw error;
    }
  },
  create: async (data: CreateBkmPanenPayload): Promise<BkmPanen> => {
    const response = await apiClient.post<BkmPanen>('/bkmPanen', data);
    return response.data;
  },
  update: async (id: string, data: UpdateBkmPanenPayload): Promise<BkmPanen> => {
    const response = await apiClient.put<BkmPanen>(`/bkmPanen/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmPanen/${id}`);
  },
  approve: async (id: string): Promise<BkmPanen> => {
    const response = await apiClient.post<BkmPanen>(`/bkmPanen/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, rejection_note?: string): Promise<BkmPanen> => {
    const response = await apiClient.post<BkmPanen>(`/bkmPanen/${id}/reject`, { rejection_note });
    return response.data;
  },
  getAllDetails: async (params?: ApiListParams): Promise<PaginatedResponse<BkmPanenDetail>> => {
    const response = await apiClient.get<PaginatedResponse<BkmPanenDetail>>('/bkmPanen/detail', { params });
    return response.data;
  },
  addDetail: async (data: CreateBkmPanenDetailPayload): Promise<BkmPanenDetail> => {
    const response = await apiClient.post<BkmPanenDetail>('/bkmPanen/detail', data);
    return response.data;
  },
  updateDetail: async (id: string, data: UpdateBkmPanenDetailPayload): Promise<BkmPanenDetail> => {
    const response = await apiClient.put<BkmPanenDetail>(`/bkmPanen/detail/${id}`, data);
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmPanen/detail/${id}`);
  },
};
