import { useQuery } from '@tanstack/react-query';
import { stagingApi } from '@/services/staging.service';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { waitingSpbRows } from '@/utils/trip';

export const waitingSpbKey = ['staging', 'waitingSpb'] as const;

/**
 * Weighings and tickets the server accepted with `202` for an SPB whose trip is
 * not dispatched yet. The contract has no push: they turn MATCHED when the trip
 * is dispatched, so this list is read on mount and on pull-to-refresh, and a
 * row disappears once it matches. A FAILED row (the worker refused the match)
 * stays, with its reason, until it is retried.
 */
export function useWaitingSpb() {
  const online = useNetworkStore((state) => state.isOnline);
  return useQuery({
    queryKey: waitingSpbKey,
    enabled: online,
    queryFn: async () => {
      const [pending, failed] = await Promise.all(['PENDING', 'FAILED'].map((status) =>
        stagingApi.getPendingLogs({ limit: 100, filters: JSON.stringify({ status }) })));
      return waitingSpbRows([...pending.data, ...failed.data]);
    },
  });
}
