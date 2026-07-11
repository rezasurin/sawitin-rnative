import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { ModApp } from '@/types/master-data';

export const modAppApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<ModApp>> => {
    const response = await apiClient.get<PaginatedResponse<ModApp>>('/modApp', { params });
    return response.data;
  },
  getById: async (id: string): Promise<ModApp> => {
    const response = await apiClient.get<ModApp>(`/modApp/${id}`);
    return response.data;
  },
};
