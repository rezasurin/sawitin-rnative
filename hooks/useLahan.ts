import { useQuery } from '@tanstack/react-query';
import { lahanApi } from '@/services/lahan.service';
import { lahanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useLahanList(params?: ApiListParams) {
  return useQuery({
    queryKey: lahanKeys.list(params),
    queryFn: () => lahanApi.getAll(params),
  });
}

export function useLahanDetail(id: string) {
  return useQuery({
    queryKey: lahanKeys.detail(id),
    queryFn: () => lahanApi.getById(id),
    enabled: !!id,
  });
}
