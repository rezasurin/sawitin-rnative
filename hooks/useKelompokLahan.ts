import { useQuery } from '@tanstack/react-query';
import { kelompokLahanApi } from '@/services/kelompok-lahan.service';
import { kelompokLahanKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';

export function useKelompokLahanList(params?: ApiListParams) {
  return useQuery({
    queryKey: kelompokLahanKeys.list(params),
    queryFn: () => kelompokLahanApi.getAll(params),
  });
}

export function useKelompokLahanDetail(id: string) {
  return useQuery({
    queryKey: kelompokLahanKeys.detail(id),
    queryFn: () => kelompokLahanApi.getById(id),
    enabled: !!id,
  });
}
