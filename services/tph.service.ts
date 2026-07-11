import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Tph, CreateTphPayload, UpdateTphPayload } from '@/types/master-data';

export const tphApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Tph>> => {
    const response = await apiClient.get<PaginatedResponse<Tph>>('/tph', { params });
    return response.data;
  },
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
