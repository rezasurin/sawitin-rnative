import { useQuery } from '@tanstack/react-query';
import { pekerjaApi } from '@/services/pekerja.service';
import { pekerjaKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function usePekerjaList(params?: ApiListParams) {
  return useQuery({
    queryKey: pekerjaKeys.list(params),
    queryFn: () => pekerjaApi.getAll(params),
  });
}

export function usePekerjaDetail(id: string) {
  return useQuery({
    queryKey: pekerjaKeys.detail(id),
    queryFn: () => pekerjaApi.getById(id),
    enabled: !!id,
  });
}
