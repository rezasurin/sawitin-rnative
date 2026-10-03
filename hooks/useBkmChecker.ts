import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bkmCheckerApi } from '@/services/bkm-checker.service';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { estateDate } from '@/utils/estateDate';
import { bkmCheckerKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';
import type {
  CreateBkmCheckerPayload,
  CreateBkmCheckerDetailPayload,
  UpdateBkmCheckerDetailPayload,
} from '@/types/bkm-checker';

// ── Queries ──────────────────────────────────────────────────────────

export function useBkmCheckerList(params?: ApiListParams) {
  return useQuery({
    queryKey: bkmCheckerKeys.list(params),
    queryFn: () => bkmCheckerApi.getAll(params),
  });
}

export function useBkmCheckerInfinite(params?: ApiListParams) {
  return useInfiniteQuery({
    queryKey: bkmCheckerKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      bkmCheckerApi.getAll({
        ...params,
        page: pageParam,
        limit: params?.limit ?? 20,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useBkmCheckerDetail(id: string) {
  return useQuery({
    queryKey: bkmCheckerKeys.detail(id),
    queryFn: () => bkmCheckerApi.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ────────────────────────────────────────────────────────

export function useCreateBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBkmCheckerPayload) => bkmCheckerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useUpdateBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBkmCheckerPayload> }) =>
      bkmCheckerApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useDeleteBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bkmCheckerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useApproveBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bkmCheckerApi.approve(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useRejectBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      bkmCheckerApi.reject(id, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}

export function useAddBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBkmCheckerDetailPayload) => bkmCheckerApi.addDetail(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.bkm_checker_id) });
    },
  });
}

export function useUpdateBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBkmCheckerDetailPayload }) =>
      bkmCheckerApi.updateDetail(id, data),
    onSuccess: (_data) => {
      const detail = _data;
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(detail.bkm_checker_id) });
    },
  });
}

export function useDeleteBkmCheckerDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bkmCheckerId }: { id: string; bkmCheckerId: string }) =>
      bkmCheckerApi.deleteDetail(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.detail(variables.bkmCheckerId) });
    },
  });
}

// ── Trip lines ───────────────────────────────────────────────────────

/**
 * Panen documents dated `day` (an estate day), for a LANGSUNG line. The recent
 * list is cached by the operational read, so it also answers offline once it has
 * been fetched; a Panen still waiting in this phone's queue is not in it yet.
 */
export function usePanenOfDay(day: string) {
  return useQuery({
    queryKey: ['bkmPanen', 'recent'],
    queryFn: () => bkmPanenApi.getAll({ limit: 100, sort: 'tanggal_laporan:desc' }),
    select: (page) => page.data.filter((panen) => panen.status !== 'CANCELLED' && estateDate(new Date(panen.tanggal_laporan)) === day),
  });
}
