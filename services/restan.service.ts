import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Restan } from '@/types/restan';

export const restanApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Restan>> => {
    const response = await apiClient.get<PaginatedResponse<Restan>>('/restan', { params });
    return response.data;
  },
  getPending: async (params?: ApiListParams): Promise<PaginatedResponse<Restan>> => {
    const response = await apiClient.get<PaginatedResponse<Restan>>('/restan/pending', { params });
    return response.data;
  },
  getById: async (id: string): Promise<Restan> => {
    const response = await apiClient.get<Restan>(`/restan/${id}`);
    return response.data;
  },
  pickup: async (id: string): Promise<Restan> => {
    const response = await apiClient.post<Restan>(`/restan/${id}/pickup`);
    return response.data;
  },
};
