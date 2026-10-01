import { readOperational, requireOnline } from './operational.service';
import { apiClient } from './api';
import { withPrecondition } from './precondition';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmChecker, CreateBkmCheckerPayload, CreateTripPayload, UpdateBkmCheckerPayload, BkmCheckerDetail, CreateBkmCheckerDetailPayload, UpdateBkmCheckerDetailPayload } from '@/types/bkm-checker';

export const bkmCheckerApi = {
  getSpb: async (id: string): Promise<{ qr_payload: string; checker_id: string; tph_id: string; jumlah_janjang: number; issued_at: string; expires_at: string }> => {
    const response = await apiClient.get(`/bkmChecker/${id}/spb`);
    return response.data;
  },
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<BkmChecker>> => {
    return readOperational('bkmChecker', '/bkmChecker', params);
  },
  getById: async (id: string): Promise<BkmChecker> => {
    return readOperational('bkmChecker', `/bkmChecker/${id}`);
  },
  create: async (data: CreateBkmCheckerPayload | CreateTripPayload): Promise<BkmChecker> => {
    const response = await apiClient.post<BkmChecker>('/bkmChecker', data);
    return response.data;
  },
  update: async (
    id: string,
    data: UpdateBkmCheckerPayload,
    /** `modified_at` this edit was based on; see services/precondition.ts. */
    expectedModifiedAt?: string | null
  ): Promise<BkmChecker> => {
    const response = await apiClient.put<BkmChecker>(
      `/bkmChecker/${id}`,
      data,
      withPrecondition(expectedModifiedAt)
    );
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmChecker/${id}`);
  },
  approve: async (id: string): Promise<BkmChecker> => {
    requireOnline();
    const response = await apiClient.post<BkmChecker>(`/bkmChecker/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, note?: string): Promise<BkmChecker> => {
    requireOnline();
    const response = await apiClient.post<BkmChecker>(`/bkmChecker/${id}/reject`, { rejection_note: note });
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
  updateDetail: async (id: string, data: UpdateBkmCheckerDetailPayload, expectedModifiedAt?: string | null): Promise<BkmCheckerDetail> => {
    const response = await apiClient.put<BkmCheckerDetail>(`/bkmChecker/detail/${id}`, data, withPrecondition(expectedModifiedAt));
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmChecker/detail/${id}`);
  },
};
