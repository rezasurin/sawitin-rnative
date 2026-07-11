import { useQuery } from '@tanstack/react-query';
import { grupPekerjaApi } from '@/services/grup-pekerja.service';
import { grupPekerjaKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useGrupPekerjaList(params?: ApiListParams) {
  return useQuery({
    queryKey: grupPekerjaKeys.list(params),
    queryFn: () => grupPekerjaApi.getAll(params),
  });
}

export function useGrupPekerjaDetail(id: string) {
  return useQuery({
    queryKey: grupPekerjaKeys.detail(id),
    queryFn: () => grupPekerjaApi.getById(id),
    enabled: !!id,
  });
}
