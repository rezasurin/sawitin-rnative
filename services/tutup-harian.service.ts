import { apiClient } from './api';
import type { CloseListItem, SubmitClosePayload, TutupHarianPreview } from '@/types/tutup-harian';

/** Every call is online-only: the daily close is never queued. */
export const tutupHarianApi = {
  preview: async (kelompok_lahan_id: string, tanggal: string): Promise<TutupHarianPreview> =>
    (await apiClient.get<TutupHarianPreview>('/tutupHarian', { params: { kelompok_lahan_id, tanggal } })).data,
  getById: async (id: string): Promise<TutupHarianPreview> =>
    (await apiClient.get<TutupHarianPreview>(`/tutupHarian/${id}`)).data,
  list: async (status = 'SUBMITTED'): Promise<CloseListItem[]> =>
    (await apiClient.get<{ data: CloseListItem[] }>('/tutupHarian/daftar', { params: { status, limit: 50 } })).data.data,
  submit: async (payload: SubmitClosePayload): Promise<TutupHarianPreview> =>
    (await apiClient.post<TutupHarianPreview>('/tutupHarian', payload)).data,
  approve: async (id: string): Promise<TutupHarianPreview> =>
    (await apiClient.post<TutupHarianPreview>(`/tutupHarian/${id}/approve`, {})).data,
  reject: async (id: string, rejection_note: string): Promise<TutupHarianPreview> =>
    (await apiClient.post<TutupHarianPreview>(`/tutupHarian/${id}/reject`, { rejection_note })).data,
};
