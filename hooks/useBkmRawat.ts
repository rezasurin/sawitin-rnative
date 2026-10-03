import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bkmRawatApi } from '@/services/bkm-rawat.service';
import type { ApiListParams } from '@/types/common';
import type { CreateBkmRawatPayload, UpdateBkmRawatPayload, CreateBkmRawatDetailPayload, UpdateBkmRawatDetailPayload } from '@/types/bkm-rawat';

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
    enabled: !!id && !id.startsWith('local:'),
  });
}

export function useBkmRawatLookups() {
  return useQuery({
    queryKey: [...bkmRawatKeys.all, 'lookups'],
    queryFn: bkmRawatApi.getLookups,
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

export function useBkmRawatActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: bkmRawatKeys.all });
  return {
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateBkmRawatPayload }) => bkmRawatApi.update(id, data), onSuccess: refresh }),
    approve: useMutation({ mutationFn: (id: string) => bkmRawatApi.approve(id), onSuccess: refresh }),
    reject: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => bkmRawatApi.reject(id, note), onSuccess: refresh }),
    addDetail: useMutation({ mutationFn: (data: CreateBkmRawatDetailPayload) => bkmRawatApi.addDetail(data), onSuccess: refresh }),
    updateDetail: useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateBkmRawatDetailPayload }) => bkmRawatApi.updateDetail(id, data), onSuccess: refresh }),
    deleteDetail: useMutation({ mutationFn: (id: string) => bkmRawatApi.deleteDetail(id), onSuccess: refresh }),
  };
}
