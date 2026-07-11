import { apiClient } from './api';
import { PaginatedResponse, ApiListParams } from '@/types/common';
import { Member, CreateMemberPayload, UpdateMemberPayload } from '@/types/master-data';

export const memberApi = {
  getAll: async (params?: ApiListParams): Promise<PaginatedResponse<Member>> => {
    const response = await apiClient.get<PaginatedResponse<Member>>('/member', { params });
    return response.data;
  },
  getById: async (id: string): Promise<Member> => {
    const response = await apiClient.get<Member>(`/member/${id}`);
    return response.data;
  },
  create: async (data: CreateMemberPayload): Promise<Member> => {
    const response = await apiClient.post<Member>('/member', data);
    return response.data;
  },
  update: async (id: string, data: UpdateMemberPayload): Promise<Member> => {
    const response = await apiClient.put<Member>(`/member/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/member/${id}`);
  },
};
