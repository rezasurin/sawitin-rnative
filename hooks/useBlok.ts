import { useQuery } from '@tanstack/react-query';
import { blokApi } from '@/services/blok.service';
import { blokKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useBlokList(params?: ApiListParams) {
  return useQuery({
    queryKey: blokKeys.list(params),
    queryFn: () => blokApi.getAll(params),
  });
}

export function useBlokDetail(id: string) {
  return useQuery({
    queryKey: blokKeys.detail(id),
    queryFn: () => blokApi.getById(id),
    enabled: !!id,
  });
}
