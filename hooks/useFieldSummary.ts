import { useCallback, useEffect, useRef, useState } from 'react';
import { fieldSummaryApi } from '@/services/field-summary.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import type { FieldSummary } from '@/types/field-summary';

type ViewState = {
  key: string;
  snapshot: FieldSummary | null;
  loaded: boolean;
  fresh: boolean;
  refreshing: boolean;
  error: string | null;
  forbidden: boolean;
};

const empty = (key: string): ViewState => ({
  key, snapshot: null, loaded: false, fresh: false, refreshing: false, error: null, forbidden: false,
});

export function useFieldSummary(enabled: boolean, farmId?: string) {
  const userId = useAuthStore((state) => state.user?.id);
  const canRead = useAuthStore((state) => state.hasPermission('mod_laporan', 'read'));
  const isOnline = useNetworkStore((state) => state.isOnline);
  const key = `${userId ?? ''}:${farmId ?? 'all'}`;
  const [state, setState] = useState<ViewState>(() => empty(key));
  const inFlight = useRef<Promise<void> | null>(null);
  const activeKey = useRef(key);
  activeKey.current = key;
  const allowed = enabled && !!userId && canRead;

  const refresh = useCallback(async (): Promise<void> => {
    if (!allowed || !userId || !useNetworkStore.getState().isOnline) return;
    if (inFlight.current) return inFlight.current;
    const requestedKey = key;
    const task = (async () => {
      setState((current) => current.key === requestedKey ? { ...current, refreshing: true, error: null } : current);
      try {
        const result = await fieldSummaryApi.fetch(farmId);
        if (activeKey.current !== requestedKey || useAuthStore.getState().user?.id !== userId ||
            !useAuthStore.getState().hasPermission('mod_laporan', 'read')) return;
        try { await fieldSummaryApi.saveLast(userId, result, farmId); } catch { /* Keep the live response even if device storage is unavailable. */ }
        if (useAuthStore.getState().user?.id !== userId) {
          try { await fieldSummaryApi.clearUser(userId); } catch { /* The old account cannot read through this hook. */ }
          return;
        }
        if (activeKey.current === requestedKey && useAuthStore.getState().user?.id === userId) {
          setState({ key: requestedKey, snapshot: result, loaded: true, fresh: true,
            refreshing: false, error: null, forbidden: false });
        }
      } catch (error) {
        if (activeKey.current !== requestedKey) return;
        const forbidden = (error as { status?: number }).status === 403;
        if (forbidden) {
          try { await fieldSummaryApi.clearUser(userId); } catch { /* Still hide the in-memory snapshot. */ }
        }
        setState((current) => current.key === requestedKey ? {
          ...current, snapshot: forbidden ? null : current.snapshot, loaded: true,
          fresh: false, refreshing: false, forbidden,
          error: forbidden ? null : 'Ringkasan belum dapat diperbarui.',
        } : current);
      }
    })();
    inFlight.current = task;
    void task.then(() => { if (inFlight.current === task) inFlight.current = null; });
    return task;
  }, [allowed, userId, key, farmId]);

  useEffect(() => {
    inFlight.current = null;
    setState(empty(key));
    if (!allowed || !userId) return;
    let active = true;
    void (async () => {
      try {
        const snapshot = await fieldSummaryApi.readLast(userId, farmId);
        if (active && activeKey.current === key) setState((current) => current.key === key && !current.fresh ?
          { ...current, snapshot, loaded: true } : current);
      } catch {
        if (active && activeKey.current === key) setState((current) => current.key === key ?
          { ...current, loaded: true } : current);
      }
      if (active && useNetworkStore.getState().isOnline) await refresh();
    })();
    return () => { active = false; };
  }, [allowed, userId, farmId, key, refresh]);

  // Only on reconnect: the mount effect above already covers starting online.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) void refresh();
    wasOnline.current = isOnline;
  }, [isOnline, refresh]);

  const current = state.key === key ? state : empty(key);
  return {
    data: allowed && !current.forbidden ? current.snapshot : null,
    loading: allowed && !current.loaded,
    refreshing: current.refreshing,
    stale: !current.fresh || !isOnline,
    offline: !isOnline,
    error: current.error,
    forbidden: current.forbidden,
    available: allowed && !current.forbidden,
    refresh,
  };
}
