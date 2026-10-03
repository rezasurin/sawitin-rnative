import { apiClient } from './api';
import type { PaginatedResponse, ApiListParams } from '@/types/common';
import type { Observasi, CreateObservasiPayload, UpdateObservasiPayload } from '@/types/observasi';

export const observasiApi = {
  getAll: async (params?: ApiListParams) => (await apiClient.get<PaginatedResponse<Observasi>>('/observasi', { params })).data,
  getById: async (id: string) => (await apiClient.get<Observasi>(`/observasi/${id}`)).data,
  create: async (payload: CreateObservasiPayload) => (await apiClient.post<Observasi>('/observasi', payload)).data,
  update: async (id: string, payload: UpdateObservasiPayload) => (await apiClient.put<Observasi>(`/observasi/${id}`, payload)).data,
  delete: async (id: string) => { await apiClient.delete(`/observasi/${id}`); },
  history: async (id: string) => (await apiClient.get<unknown>(`/observasi/${id}/history`)).data,
};
