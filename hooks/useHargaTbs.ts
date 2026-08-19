import { useQuery } from '@tanstack/react-query';
import { hargaTbsApi } from '@/services/harga-tbs.service';
import { hargaTbsKeys } from '@/services/queryKeys';

export function useHargaTbsLatest() {
  return useQuery({
    queryKey: hargaTbsKeys.latest(),
    queryFn: () => hargaTbsApi.getLatest(),
  });
}
