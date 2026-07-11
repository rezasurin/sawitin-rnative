import { apiClient } from './api';
import { Penjualan, CreatePenjualanPayload, UpdatePenjualanPayload } from '@/types/penjualan';

export const penjualanApi = {
  getAll: async (params?: Record<string, unknown>): Promise<unknown> => {
    const response = await apiClient.post('/penjualan/list', params);
    return response.data;
  },
  getById: async (id: string): Promise<Penjualan> => {
    const response = await apiClient.get<Penjualan>(`/penjualan/${id}`);
    return response.data;
  },
  create: async (data: CreatePenjualanPayload): Promise<Penjualan> => {
    const response = await apiClient.post<Penjualan>('/penjualan', data);
    return response.data;
  },
  update: async (id: string, data: UpdatePenjualanPayload): Promise<Penjualan> => {
    const response = await apiClient.put<Penjualan>(`/penjualan/${id}`, data);
    return response.data;
  },
};
