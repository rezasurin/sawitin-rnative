import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { bkmPanenKeys } from '@/services/queryKeys';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import type { ApiListParams } from '@/types/common';
import type {
  BkmPanen,
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

export function useApproveBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bkmPanenApi.approve(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.detail(id) });
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

// ── Compound mutation: create/update header + all details ─────────────

export function useSubmitBkmPanen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BkmPanen> => {
      const { header, details, isEditing, editingId } =
        useBkmPanenStore.getState();

      const headerPayload: CreateBkmPanenPayload = {
        blok_id: header.blok_id!,
        lahan_id: header.lahan_id || undefined,
        tanggal_laporan: header.tanggal_laporan,
        keterangan: header.keterangan || undefined,
        grup_pekerja_id: header.grup_pekerja_id || undefined,
      };

      const detailPayloads = details.map((d) => ({
        pekerja_id: d.pekerja_id,
        tph_id: d.tph_id,
        jenis_pekerjaan: d.jenis_pekerjaan,
        janjang_normal: d.janjang_normal,
        buah_mentah: d.buah_mentah,
        over_ripe: d.over_ripe,
        tangkai_panjang: d.tangkai_panjang,
        buah_abnormal: d.buah_abnormal,
        janjang_kosong: d.janjang_kosong,
        jumlah_janjang: d.jumlah_janjang,
        jumlah_brondol: d.jumlah_brondol ?? undefined,
        foto_url: d.foto_url ?? undefined,
        lat: d.lat ?? undefined,
        lng: d.lng ?? undefined,
        note: d.note ?? undefined,
      }));

      // ── Edit mode ──────────────────────────────────────────────
      if (isEditing && editingId) {
        const { deletedDetailIds } = useBkmPanenStore.getState();

        // 1. Update header
        await bkmPanenApi.update(editingId, headerPayload);

        // 2. Delete removed details
        if (deletedDetailIds && deletedDetailIds.length > 0) {
          await Promise.all(
            deletedDetailIds.map((id) => bkmPanenApi.deleteDetail(id))
          );
        }

        // 3. Upsert details
        await Promise.all(
          detailPayloads.map((payload, i) => {
            const detail = details[i];
            if (detail.serverId) {
              // Existing detail → PUT
              return bkmPanenApi.updateDetail(detail.serverId, payload);
            }
            // New detail → POST
            return bkmPanenApi.addDetail({
              ...payload,
              bkm_panen_id: editingId,
            });
          }),
        );

        // 4. Submit
        return bkmPanenApi.update(editingId, {
          status: 'SUBMITTED',
        });
      }

      // ── Create mode ────────────────────────────────────────────
      const panen = await bkmPanenApi.create(headerPayload);
      await Promise.all(
        detailPayloads.map((d) =>
          bkmPanenApi.addDetail({ ...d, bkm_panen_id: panen.id }),
        ),
      );
      return bkmPanenApi.update(panen.id, {
        status: 'SUBMITTED',
      });
    },
    onSuccess: () => {
      const { editingId } = useBkmPanenStore.getState();
      queryClient.invalidateQueries({ queryKey: bkmPanenKeys.lists() });
      if (editingId) {
        queryClient.invalidateQueries({
          queryKey: bkmPanenKeys.detail(editingId),
        });
      }
    },
  });
}
