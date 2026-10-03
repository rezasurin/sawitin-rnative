import { useQuery } from '@tanstack/react-query';
import { lookupCacheDb } from '@/services/database';
import { openRestanKey } from '@/services/master-cache';
import { pullDelta } from '@/services/sync.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { visibleRestan } from '@/utils/dispatch';
import type { Restan } from '@/types/restan';

/**
 * Open restan a trip line can collect, read from the offline cache that delta
 * sync keeps. Online, one pull runs first so the list is current; offline, or
 * when the pull fails, the stored copy answers. Restan a queued trip already
 * claims is hidden, so the Mandor cannot pick the same fruit on two trips from
 * one phone.
 */
export function useOpenRestan(draftLines: { restan_id?: string }[] = []) {
  const userId = useAuthStore((state) => state.user?.id);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const queue = useSyncQueueStore((state) => state.queue);
  const cached = useQuery({
    queryKey: ['restan', 'open', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (isOnline) await pullDelta(userId!).catch(() => undefined);
      return ((await lookupCacheDb.get(openRestanKey(userId!))) as Restan[] | null) ?? null;
    },
  });
  return {
    /** False until a pull has ever succeeded on this phone: an empty list then means "unknown", not "none". */
    loaded: cached.data != null,
    restan: visibleRestan(cached.data, queue, draftLines),
  };
}
