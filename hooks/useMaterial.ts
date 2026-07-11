import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialApi } from '@/services/material.service';
import { materialKeys } from '@/services/queryKeys';
import type { ApiListParams } from '@/types/common';
import type { Material, CreateMaterialPayload, UpdateMaterialPayload } from '@/types/material';

export function useMaterialList(params?: ApiListParams) {
  return useQuery({
    queryKey: materialKeys.list(params),
    queryFn: () => materialApi.getAll(params),
  });
}

export function useMaterialDetail(id: string) {
  return useQuery({
    queryKey: materialKeys.detail(id),
    queryFn: () => materialApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaterialPayload) => materialApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaterialPayload }) =>
      materialApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => materialApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
    },
  });
}
