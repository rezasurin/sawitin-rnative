import { useQuery } from '@tanstack/react-query';
import { tipePekerjaanApi } from '@/services/tipe-pekerjaan.service';
import { tipePekerjaanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useTipePekerjaanList(params?: ApiListParams) {
  return useQuery({
    queryKey: tipePekerjaanKeys.list(params),
    queryFn: () => tipePekerjaanApi.getAll(params),
  });
}

export function useTipePekerjaanDetail(id: string) {
  return useQuery({
    queryKey: tipePekerjaanKeys.detail(id),
    queryFn: () => tipePekerjaanApi.getById(id),
    enabled: !!id,
  });
}
