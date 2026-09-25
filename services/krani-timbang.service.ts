import { readOperational, requireOnline } from './operational.service';
import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import type { HarvestTrace } from '@/types/harvest-trace';
import { KraniTimbang, CreateKraniTimbangPayload, UpdateKraniTimbangPayload, KraniTimbangDetail, CreateKraniTimbangDetailPayload, UpdateKraniTimbangDetailPayload } from '@/types/krani-timbang';

export const kraniTimbangApi = {
  trace: async (id: string): Promise<HarvestTrace> => {
    requireOnline();
    return (await apiClient.get<HarvestTrace>(`/kraniTimbang/${id}/trace`)).data;
  },
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<KraniTimbang>> => {
    return readOperational('kraniTimbang', '/kraniTimbang', params);
  },
  getById: async (id: string): Promise<KraniTimbang> => {
    return readOperational('kraniTimbang', `/kraniTimbang/${id}`);
  },
  create: async (data: CreateKraniTimbangPayload): Promise<KraniTimbang> => {
    const response = await apiClient.post<KraniTimbang>('/kraniTimbang', data);
    return response.data;
  },
  update: async (id: string, data: UpdateKraniTimbangPayload): Promise<KraniTimbang> => {
    const response = await apiClient.put<KraniTimbang>(`/kraniTimbang/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/kraniTimbang/${id}`);
  },
  approve: async (id: string): Promise<KraniTimbang> => {
    requireOnline();
    const response = await apiClient.post<KraniTimbang>(`/kraniTimbang/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, rejection_note?: string): Promise<KraniTimbang> => {
    requireOnline();
    const response = await apiClient.post<KraniTimbang>(`/kraniTimbang/${id}/reject`, { rejection_note });
    return response.data;
  },
  getAllDetails: async (params?: ApiListParams): Promise<PaginatedResponse<KraniTimbangDetail>> => {
    const response = await apiClient.get<PaginatedResponse<KraniTimbangDetail>>('/kraniTimbang/detail', { params });
    return response.data;
  },
  addDetail: async (data: CreateKraniTimbangDetailPayload): Promise<KraniTimbangDetail> => {
    const response = await apiClient.post<KraniTimbangDetail>('/kraniTimbang/detail', data);
    return response.data;
  },
  updateDetail: async (id: string, data: UpdateKraniTimbangDetailPayload): Promise<KraniTimbangDetail> => {
    const response = await apiClient.put<KraniTimbangDetail>(`/kraniTimbang/detail/${id}`, data);
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/kraniTimbang/detail/${id}`);
  },
};
