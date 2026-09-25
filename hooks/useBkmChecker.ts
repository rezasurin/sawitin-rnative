import { useAuthStore } from '@/stores/useAuthStore';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bkmCheckerApi } from '@/services/bkm-checker.service';
import { bkmCheckerKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';
import type {
  BkmChecker,
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

// ── Compound mutation: create header + all details + submit ──────────

export function useSubmitBkmChecker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      header,
      details,
    }: {
      header: CreateBkmCheckerPayload;
      details: Omit<CreateBkmCheckerDetailPayload, 'bkm_checker_id'>[];
    }): Promise<BkmChecker> => {
      // 1. Create header
      const checker = await bkmCheckerApi.create(header);

      // 2. Create all details
      for (const detail of details) {
        await bkmCheckerApi.addDetail({ ...detail, bkm_checker_id: checker.id });
      }

      // 3. Submit (set status to SUBMITTED)
      if (!useAuthStore.getState().hasPermission('mod_bkm_checker', 'update')) return checker;
      return bkmCheckerApi.update(checker.id, { status: 'SUBMITTED' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bkmCheckerKeys.lists() });
    },
  });
}
