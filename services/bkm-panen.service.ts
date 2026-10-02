import { readOperational, requireOnline } from './operational.service';
import { apiClient } from './api';
import { withPrecondition } from './precondition';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { BkmPanen, CreateBkmPanenPayload, UpdateBkmPanenPayload, BkmPanenDetail, CreateBkmPanenDetailPayload, UpdateBkmPanenDetailPayload } from '@/types/bkm-panen';

export const bkmPanenApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<BkmPanen>> => readOperational('bkmPanen', '/bkmPanen', params),
  getById: async (id: string): Promise<BkmPanen> => readOperational('bkmPanen', `/bkmPanen/${id}`),
  create: async (data: CreateBkmPanenPayload): Promise<BkmPanen> => {
    const response = await apiClient.post<BkmPanen>('/bkmPanen', data);
    return response.data;
  },
  update: async (
    id: string,
    data: UpdateBkmPanenPayload,
    /** `modified_at` this edit was based on; see services/precondition.ts. */
    expectedModifiedAt?: string | null
  ): Promise<BkmPanen> => {
    const response = await apiClient.put<BkmPanen>(
      `/bkmPanen/${id}`,
      data,
      withPrecondition(expectedModifiedAt)
    );
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmPanen/${id}`);
  },
  reject: async (id: string, rejection_note?: string): Promise<BkmPanen> => {
    requireOnline();
    const response = await apiClient.post<BkmPanen>(`/bkmPanen/${id}/reject`, { rejection_note });
    return response.data;
  },
  getAllDetails: async (params?: ApiListParams): Promise<PaginatedResponse<BkmPanenDetail>> => {
    const response = await apiClient.get<PaginatedResponse<BkmPanenDetail>>('/bkmPanen/detail', { params });
    return response.data;
  },
  addDetail: async (data: CreateBkmPanenDetailPayload): Promise<BkmPanenDetail> => {
    const response = await apiClient.post<BkmPanenDetail>('/bkmPanen/detail', data);
    return response.data;
  },
  updateDetail: async (id: string, data: UpdateBkmPanenDetailPayload): Promise<BkmPanenDetail> => {
    const response = await apiClient.put<BkmPanenDetail>(`/bkmPanen/detail/${id}`, data);
    return response.data;
  },
  deleteDetail: async (id: string): Promise<void> => {
    await apiClient.delete(`/bkmPanen/detail/${id}`);
  },
};
