import type { SyncAction } from '@/types/sync';

// Keep this list aligned with processItem. A queue entry without a processor
// branch cannot be delivered, so reject it before writing to SQLite.
const SUPPORTED_ACTIONS: Record<string, readonly SyncAction[]> = {
  bkm_panen: ['CREATE', 'UPDATE', 'DELETE'],
  bkm_checker: ['CREATE', 'UPDATE', 'DELETE'],
  bkm_rawat: ['CREATE', 'UPDATE', 'DELETE'],
  bkm_rawat_detail: ['CREATE', 'UPDATE', 'DELETE'],
  bkm_checker_detail: ['UPDATE'],
  krani_timbang_detail: ['UPDATE'],
  krani_timbang: ['UPDATE', 'DELETE'],
  observasi: ['CREATE'],
  pemakaian_kendaraan: ['CREATE', 'UPDATE'],
  tiket_pks: ['CREATE'],
};

export function isSupportedSyncAction(module: string, action: SyncAction): boolean {
  return SUPPORTED_ACTIONS[module]?.includes(action) ?? false;
}
