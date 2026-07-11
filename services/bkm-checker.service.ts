import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmChecker, CreateBkmCheckerPayload, UpdateBkmCheckerPayload, BkmCheckerDetail, CreateBkmCheckerDetailPayload, UpdateBkmCheckerDetailPayload } from '@/types/bkm-checker';

export const bkmCheckerApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<BkmChecker>> => {
    const response = await apiClient.get<PaginatedResponse<BkmChecker>>('/bkmChecker', { params });
    return response.data;
  },
  getById: async (id: string): Promise<BkmChecker> => {
    const response = await apiClient.get<BkmChecker>(`/bkmChecker/${id}`);
    return response.data;
  },
  create: async (data: CreateBkmCheckerPayload): Promise<BkmChecker> => {
    const response = await apiClient.post<BkmChecker>('/bkmChecker', data);
    return response.data;
  },
  update: async (id: string, data: UpdateBkmCheckerPayload): Promise<BkmChecker> => {
    const response = await apiClient.put<BkmChecker>(`/bkmChecker/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmChecker/${id}`);
  },
  approve: async (id: string): Promise<BkmChecker> => {
    const response = await apiClient.post<BkmChecker>(`/bkmChecker/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, note?: string): Promise<BkmChecker> => {
    const response = await apiClient.post<BkmChecker>(`/bkmChecker/${id}/reject`, { note });
    return response.data;
  },
  getReadyForWeighing: async (id?: string): Promise<PaginatedResponse<BkmChecker>> => {
    const response = await apiClient.get<PaginatedResponse<BkmChecker>>('/bkmChecker/ready-for-weighing', { params: id ? { id } : undefined });
    return response.data;
  },
  getReadyToLoad: async (params?: { blok_id?: string; tanggal?: string }): Promise<PaginatedResponse<BkmChecker>> => {
    const response = await apiClient.get<PaginatedResponse<BkmChecker>>('/bkmChecker/ready-to-load', { params });
    return response.data;
  },
  getAvailableTph: async (): Promise<unknown> => {
    const response = await apiClient.get('/bkmChecker/available-tph');
    return response.data;
  },
  getAllDetails: async (params?: ApiListParams): Promise<PaginatedResponse<BkmCheckerDetail>> => {
    const response = await apiClient.get<PaginatedResponse<BkmCheckerDetail>>('/bkmChecker/detail', { params });
    return response.data;
  },
  addDetail: async (data: CreateBkmCheckerDetailPayload): Promise<BkmCheckerDetail> => {
    const response = await apiClient.post<BkmCheckerDetail>('/bkmChecker/detail', data);
    return response.data;
  },
  updateDetail: async (id: string, data: UpdateBkmCheckerDetailPayload): Promise<BkmCheckerDetail> => {
    const response = await apiClient.put<BkmCheckerDetail>(`/bkmChecker/detail/${id}`, data);
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmChecker/detail/${id}`);
  },
};
