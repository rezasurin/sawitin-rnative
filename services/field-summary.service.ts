import { apiClient } from '@/services/api';
import { lookupCacheDb } from '@/services/database';
import type { FieldSummary } from '@/types/field-summary';

const resource = 'laporan-r11';
const cacheKey = (userId: string, farmId?: string) => `${userId}:${resource}:${farmId ?? 'all'}`;

function isFieldSummary(value: unknown): value is FieldSummary {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<FieldSummary>;
  return row.definition?.id === 'R11' && typeof row.definition.version === 'number' &&
    typeof row.generated_at === 'string' && typeof row.tanggal === 'string' &&
    typeof row.timezone === 'string' && !!row.produksi?.approved && !!row.produksi?.submitted &&
    !!row.restan?.approved && !!row.restan?.submitted &&
    Array.isArray(row.persetujuan);
}

export const fieldSummaryApi = {
  fetch: async (farmId?: string): Promise<FieldSummary> => {
    const response = await apiClient.get<FieldSummary>('/laporan/ringkasan', {
      params: farmId ? { kelompok_lahan_id: farmId } : undefined,
    });
    if (!isFieldSummary(response.data)) throw new Error('Format ringkasan lapangan tidak dikenal.');
    return response.data;
  },
  readLast: async (userId: string, farmId?: string): Promise<FieldSummary | null> => {
    const value = await lookupCacheDb.get(cacheKey(userId, farmId));
    return isFieldSummary(value) ? value : null;
  },
  saveLast: (userId: string, value: FieldSummary, farmId?: string) =>
    lookupCacheDb.save(cacheKey(userId, farmId), value),
  clearUser: (userId: string) => lookupCacheDb.clearResource(userId, resource),
};
