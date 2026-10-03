import { apiClient } from './api';
import { requireOnline } from './operational.service';
import type { SyncQueueItem } from '@/types/sync';

export const queueModulePaths = { bkm_panen: 'bkmPanen', bkm_checker: 'bkmChecker', bkm_checker_detail: 'bkmChecker', bkm_rawat: 'bkmRawat', bkm_rawat_detail: 'bkmRawat', krani_timbang: 'kraniTimbang', krani_timbang_detail: 'kraniTimbang', pemakaian_kendaraan: 'pemakaianKendaraan', tiket_pks: 'tiketPks' } as const;
export async function latestQueueDocument(item: SyncQueueItem): Promise<Record<string, unknown>> {
  requireOnline();
  const payload = item.payload ?? {};
  if (item.module === 'tiket_pks') {
    const tripId = payload.krani_timbang_id;
    if (typeof tripId !== 'string') throw new Error('Trip tiket tidak tersedia.');
    const response = await apiClient.get('/tiketPks', { params: { limit: 2, filters: JSON.stringify({ krani_timbang_id: tripId }) } });
    const ticket = response.data.data?.find((row: { krani_timbang_id: string }) => row.krani_timbang_id === tripId);
    if (!ticket) throw new Error('Tiket pada server belum tersedia.');
    return ticket;
  }
  const id = payload.server_id ?? payload.documentId ?? payload.bkm_rawat_id ?? payload.id;
  if (!id) throw new Error('Dokumen baru belum memiliki versi server.');
  const path = queueModulePaths[item.module as keyof typeof queueModulePaths];
  if (!path) throw new Error('Jenis dokumen tidak dikenal.');
  return (await apiClient.get(`/${path}/${id}`)).data;
}
