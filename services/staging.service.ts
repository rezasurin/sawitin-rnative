import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { PendingTimbangLog, SubmitStagingPayload } from '@/types/staging';

export const stagingApi = {
  submitPayload: async (data: SubmitStagingPayload): Promise<unknown> => {
    const response = await apiClient.post('/staging/krani-timbang', data);
    return response.data;
  },
  getPendingLogs: async (params?: ApiListParams): Promise<PaginatedResponse<PendingTimbangLog>> => {
    const response = await apiClient.get<PaginatedResponse<PendingTimbangLog>>('/staging/krani-timbang', { params });
    return response.data;
  },
  /** Retry a log the worker refused; a waiting SPB log needs its trip dispatched (else `409 SPB_TRIP_NOT_DISPATCHED`). */
  retryPendingLog: async (id: string): Promise<unknown> => (await apiClient.post(`/staging/krani-timbang/${id}/retry`)).data,
  getPendingLogById: async (id: string): Promise<PendingTimbangLog> => {
    const response = await apiClient.get<PendingTimbangLog>(`/staging/krani-timbang/${id}`);
    return response.data;
  },
};
