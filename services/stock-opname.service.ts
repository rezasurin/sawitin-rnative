import { apiClient } from './api';
import type { ApiListParams, PaginatedResponse } from '@/types/common';
import type { StockOpname } from '@/types/stock-opname';

export const stockOpnameApi = {
  getAll: async (params?: ApiListParams) => (await apiClient.get<PaginatedResponse<StockOpname>>('/stockOpname', { params })).data,
  getById: async (id: string) => (await apiClient.get<StockOpname>(`/stockOpname/${id}`)).data,
  history: async (id: string) => (await apiClient.get<unknown>(`/stockOpname/${id}/history`)).data,
};
