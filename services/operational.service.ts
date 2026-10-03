import { apiClient } from './api';
import { lookupCacheDb } from './database';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { modulePermission, type OperationalModule } from '@/utils/operational-policy';
import type { DocumentStatus } from '@/types/common';

export interface AuditEvent {
  id: string;
  action: string;
  status_from: DocumentStatus | null;
  status_to: DocumentStatus | null;
  created_by: string;
  reason?: string | null;
  created_at: string;
}

export function requireOnline() {
  if (!useNetworkStore.getState().isOnline) throw new Error('Tindakan ini membutuhkan koneksi internet.');
}

export async function readOperational<T>(module: OperationalModule, path: string, params?: object): Promise<T> {
  const userId = useAuthStore.getState().user?.id;
  const key = `${userId}:operational:${module}:${path}:${JSON.stringify(params ?? {})}`;
  try {
    const response = await apiClient.get<T>(path, { params });
    if (userId) await lookupCacheDb.save(key, response.data).catch(() => undefined);
    return response.data;
  } catch (error) {
    const status = (error as { status?: number }).status;
    // Never mask permission changes, deletion, or a state conflict with cache.
    if (status && status < 500) throw error;
    const cached = userId ? await lookupCacheDb.get(key) : null;
    if (cached != null) return cached as T;
    throw error;
  }
}

export async function readHistory(module: OperationalModule, id: string): Promise<AuditEvent[]> {
  requireOnline();
  if (!useAuthStore.getState().hasPermission(modulePermission[module], 'read')) throw new Error('Izin membaca riwayat tidak tersedia.');
  const response = await apiClient.get<AuditEvent[]>(`/${module}/${id}/history`);
  const userId = useAuthStore.getState().user?.id;
  if (userId) await lookupCacheDb.save(`${userId}:audit:${module}:${id}`, response.data).catch(() => undefined);
  return response.data;
}
