import { useQuery } from '@tanstack/react-query';
import { tphApi } from '@/services/tph.service';
import { tphKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useTphList(params?: ApiListParams) {
  return useQuery({
    queryKey: tphKeys.list(params),
    queryFn: () => tphApi.getAll(params),
  });
}

export function useTphDetail(id: string) {
  return useQuery({
    queryKey: tphKeys.detail(id),
    queryFn: () => tphApi.getById(id),
    enabled: !!id,
  });
}
