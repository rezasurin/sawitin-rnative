import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { bkmPanenKeys } from '@/services/queryKeys';
import { nextPage } from '@/services/master-cache';
import type { ApiListParams } from '@/types/common';
import type {
  CreateBkmPanenPayload,
  UpdateBkmPanenPayload,
  BkmPanenDetail,
  CreateBkmPanenDetailPayload,
  UpdateBkmPanenDetailPayload,
} from '@/types/bkm-panen';

// ── Queries ──────────────────────────────────────────────────────────

export function useBkmPanenList(params?: ApiListParams) {
  return useQuery({
    queryKey: bkmPanenKeys.list(params),
    queryFn: () => bkmPanenApi.getAll(params),
  });
}

export function useBkmPanenInfinite(params?: ApiListParams) {
  return useInfiniteQuery({
    queryKey: bkmPanenKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      bkmPanenApi.getAll({
        ...params,
        page: pageParam,
        limit: params?.limit ?? 20,
      }),
    getNextPageParam: nextPage,
    initialPageParam: 1,
  });
}

export function useBkmPanenDetail(id: string) {
  return useQuery({
    queryKey: bkmPanenKeys.detail(id),
    queryFn: () => bkmPanenApi.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────────────────

export function useCreateBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBkmPanenPayload) => bkmPanenApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
    },
  });
}

export function useUpdateBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmPanenPayload }) =>
      bkmPanenApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
    },
  });
}

export function useDeleteBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bkmPanenApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
    },
  });
}

export function useRejectBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      bkmPanenApi.reject(id, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
    },
  });
}

// ── Detail mutations ─────────────────────────────────────────────────

export function useAddBkmPanenDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBkmPanenDetailPayload) => bkmPanenApi.addDetail(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(variables.bkm_panen_id) });
    },
  });
}

export function useUpdateBkmPanenDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmPanenDetailPayload }) =>
      bkmPanenApi.updateDetail(id, data),
    onSuccess: (_data) => {
      const detail = _data;
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(detail.bkm_panen_id) });
    },
  });
}

export function useDeleteBkmPanenDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bkmPanenId }: { id: string; bkmPanenId: string }) =>
      bkmPanenApi.deleteDetail(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(variables.bkmPanenId) });
    },
  });
}
