import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kraniTimbangApi } from '@/services/krani-timbang.service';
import type { ApiListParams } from '@/types/common';
import type { CreateKraniTimbangPayload, UpdateKraniTimbangPayload } from '@/types/krani-timbang';

export const kraniTimbangKeys = {
  all: ['kraniTimbang'] as const,
  lists: () => [...kraniTimbangKeys.all, 'list'] as const,
  list: (filters?: ApiListParams) => [...kraniTimbangKeys.lists(), filters ?? {}] as const,
  details: () => [...kraniTimbangKeys.all, 'detail'] as const,
  detail: (id: string) => [...kraniTimbangKeys.details(), id] as const,
};

export function useKraniTimbangList(params?: ApiListParams) {
  return useQuery({
    queryKey: kraniTimbangKeys.list(params),
    queryFn: () => kraniTimbangApi.getAll(params),
  });
}

export function useKraniTimbangDetail(id: string) {
  return useQuery({
    queryKey: kraniTimbangKeys.detail(id),
    queryFn: () => kraniTimbangApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateKraniTimbang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKraniTimbangPayload) => kraniTimbangApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kraniTimbangKeys.lists() });
    },
  });
}
