import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Material, CreateMaterialPayload, UpdateMaterialPayload } from '@/types/master-data';

export const materialApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Material>> => {
    const response = await apiClient.get<PaginatedResponse<Material>>('/material', { params });
    return response.data;
  },
  getById: async (id: string): Promise<Material> => {
    const response = await apiClient.get<Material>(`/material/${id}`);
    return response.data;
  },
  create: async (data: CreateMaterialPayload): Promise<Material> => {
    const response = await apiClient.post<Material>('/material', data);
    return response.data;
  },
  update: async (id: string, data: UpdateMaterialPayload): Promise<Material> => {
    const response = await apiClient.put<Material>(`/material/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/material/${id}`);
  },
};
