import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { GrupPekerja, CreateGrupPekerjaPayload, UpdateGrupPekerjaPayload } from '@/types/master-data';

export const grupPekerjaApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<GrupPekerja>> => {
    const response = await apiClient.get<PaginatedResponse<GrupPekerja>>('/grupPekerja', { params });
    return response.data;
  },
  getById: async (id: string): Promise<GrupPekerja> => {
    const response = await apiClient.get<GrupPekerja>(`/grupPekerja/${id}`);
    return response.data;
  },
  create: async (data: CreateGrupPekerjaPayload): Promise<GrupPekerja> => {
    const response = await apiClient.post<GrupPekerja>('/grupPekerja', data);
    return response.data;
  },
  update: async (id: string, data: UpdateGrupPekerjaPayload): Promise<GrupPekerja> => {
    const response = await apiClient.put<GrupPekerja>(`/grupPekerja/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/grupPekerja/${id}`);
  },
};
