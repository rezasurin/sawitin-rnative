import { apiClient } from './api';
import { requireOnline } from './operational.service';
import type { MenungguSpbResponse } from '@/types/staging';
import type { CreateTiketPksBySpbPayload, CreateTiketPksPayload, TiketPks, TiketPksList, UpdateTiketPksPayload } from '@/types/tiket-pks';
import type { AuditEvent } from './operational.service';

export const tiketPksApi = {
  byTrip: async (tripId: string): Promise<TiketPks | null> => {
    requireOnline();
    const response = await apiClient.get<TiketPksList>('/tiketPks', {
      params: { limit: 2, filters: JSON.stringify({ krani_timbang_id: tripId }) },
    });
    return response.data.data.find((row) => row.krani_timbang_id === tripId) ?? null;
  },
  /** A filed ticket by its number, which is unique per organization. */
  byNumber: async (nomorTiket: string): Promise<TiketPks | null> => {
    const response = await apiClient.get<TiketPksList>('/tiketPks', {
      params: { limit: 2, filters: JSON.stringify({ nomor_tiket: nomorTiket }) },
    });
    return response.data.data.find((row) => row.nomor_tiket === nomorTiket) ?? null;
  },
  getById: async (id: string) => (await apiClient.get<TiketPks>(`/tiketPks/${id}`)).data,
  create: async (data: CreateTiketPksPayload) => (await apiClient.post<TiketPks>('/tiketPks', data)).data,
  /** `201` the ticket, or `202` waiting for its trip to be dispatched (`menunggu_spb`). */
  createBySpb: async (data: CreateTiketPksBySpbPayload) =>
    (await apiClient.post<TiketPks | MenungguSpbResponse>('/tiketPks', data)).data,
  update: async (id: string, data: UpdateTiketPksPayload) => (await apiClient.put<TiketPks>(`/tiketPks/${id}`, data)).data,
  delete: async (id: string) => { await apiClient.delete(`/tiketPks/${id}`); },
  history: async (id: string) => (await apiClient.get<AuditEvent[]>(`/tiketPks/${id}/history`)).data,
};
