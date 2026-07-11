import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmRawat, CreateBkmRawatPayload, UpdateBkmRawatPayload, BkmRawatDetail, CreateBkmRawatDetailPayload, UpdateBkmRawatDetailPayload } from '@/types/bkm-rawat';

export const bkmRawatApi = {
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
  approve: async (id: string): Promise<BkmRawat> => {
    const response = await apiClient.post<BkmRawat>(`/bkmRawat/${id}/approve`);
    return response.data;
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
