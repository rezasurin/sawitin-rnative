import { useQuery } from '@tanstack/react-query';
import { tutupHarianApi } from '@/services/tutup-harian.service';
import { tutupHarianKeys } from '@/services/queryKeys';
import { useNetworkStore } from '@/stores/useNetworkStore';

// Closes are read live and never cached offline: a stale preview would hide a new blocker.
const live = { retry: false, refetchOnMount: 'always' as const, staleTime: 0 };

export function useClosePreview(kelompokLahanId: string, tanggal: string) {
  const online = useNetworkStore((state) => state.isOnline);
  return useQuery({
    queryKey: tutupHarianKeys.preview(kelompokLahanId, tanggal),
    queryFn: () => tutupHarianApi.preview(kelompokLahanId, tanggal),
    enabled: online && !!kelompokLahanId && !!tanggal, ...live,
  });
}

export function useCloseDetail(id: string) {
  const online = useNetworkStore((state) => state.isOnline);
  return useQuery({
    queryKey: tutupHarianKeys.detail(id),
    queryFn: () => tutupHarianApi.getById(id),
    enabled: online && !!id, ...live,
  });
}

export function usePendingCloses() {
  const online = useNetworkStore((state) => state.isOnline);
  return useQuery({
    queryKey: tutupHarianKeys.pending(),
    queryFn: () => tutupHarianApi.list('SUBMITTED'),
    enabled: online, ...live,
  });
}
