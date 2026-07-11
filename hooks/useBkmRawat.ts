import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bkmRawatApi } from '@/services/bkm-rawat.service';
import type { ApiListParams } from '@/types/common';
import type { CreateBkmRawatPayload, UpdateBkmRawatPayload } from '@/types/bkm-rawat';

export const bkmRawatKeys = {
  all: ['bkmRawat'] as const,
  lists: () => [...bkmRawatKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...bkmRawatKeys.lists(), filters ?? {}] as const,
  details: () => [...bkmRawatKeys.all, 'detail'] as const,
  detail: (id: string) => [...bkmRawatKeys.details(), id] as const,
};

export function useBkmRawatList(params?: ApiListParams) {
  return useQuery({
    queryKey: bkmRawatKeys.list(params),
    queryFn: () => bkmRawatApi.getAll(params),
  });
}

export function useBkmRawatDetail(id: string) {
  return useQuery({
    queryKey: bkmRawatKeys.detail(id),
    queryFn: () => bkmRawatApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBkmRawat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBkmRawatPayload) => bkmRawatApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmRawatKeys.lists() });
    },
  });
}

export function useDeleteBkmRawat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bkmRawatApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmRawatKeys.lists() });
    },
  });
}
