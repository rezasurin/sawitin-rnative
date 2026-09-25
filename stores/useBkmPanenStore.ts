import {
  CreateBkmPanenDetailPayload,
  CreateBkmPanenPayload,
} from "@/types/bkm-panen";
import { create } from "zustand";

interface BkmPanenDetailDraft extends CreateBkmPanenDetailPayload {
  _tempId: string;
  serverId?: string;
}

interface BkmPanenDraftState {
  header: CreateBkmPanenPayload;
  details: BkmPanenDetailDraft[];
  isEditing: boolean;
  editingId: string | null;
  /**
   * The `modified_at` this edit was loaded from, sent as `If-Unmodified-Since`
   * so a queued change cannot silently overwrite someone else's later edit.
   */
  editingModifiedAt: string | null;
  deletedDetailIds: string[];
}

interface BkmPanenStore extends BkmPanenDraftState {
  setHeader: (header: Partial<CreateBkmPanenPayload>) => void;
  addDetail: (detail: CreateBkmPanenDetailPayload) => void;
  updateDetail: (
    tempId: string,
    data: Partial<CreateBkmPanenDetailPayload>,
  ) => void;
  removeDetail: (tempId: string) => void;
  startEditing: (
    id: string,
    header: CreateBkmPanenPayload,
    details: BkmPanenDetailDraft[],
    modifiedAt?: string | null,
  ) => void;
  reset: () => void;
}

const initialHeader: CreateBkmPanenPayload = {
  blok_id: '',
  lahan_id: '',
  tanggal_laporan: '',
};

let tempIdCounter = 0;
const generateTempId = () => `temp_panen_${++tempIdCounter}`;

export const useBkmPanenStore = create<BkmPanenStore>((set) => ({
  header: { ...initialHeader },
  details: [],
  isEditing: false,
  editingId: null,
  editingModifiedAt: null,
  deletedDetailIds: [],

  setHeader: (partial) =>
    set((state) => ({ header: { ...state.header, ...partial } })),

  addDetail: (detail) =>
    set((state) => ({
      details: [...state.details, { ...detail, _tempId: generateTempId() }],
    })),

  updateDetail: (tempId, data) =>
    set((state) => ({
      details: state.details.map((d) => {
        if (d._tempId !== tempId) return d;
        const updated = { ...d, ...data };
        // Auto-calculate jumlah_janjang from grading fields
        updated.jumlah_janjang =
          (updated.janjang_normal ?? 0) +
          (updated.buah_mentah ?? 0) +
          (updated.over_ripe ?? 0) +
          (updated.tangkai_panjang ?? 0) +
          (updated.buah_abnormal ?? 0) +
          (updated.janjang_kosong ?? 0);
        return updated;
      }),
    })),

  removeDetail: (tempId) =>
    set((state) => {
      const detailToRemove = state.details.find((d) => d._tempId === tempId);
      const deletedDetailIds = [...state.deletedDetailIds];
      if (detailToRemove?.serverId) {
        deletedDetailIds.push(detailToRemove.serverId);
      }
      return {
        details: state.details.filter((d) => d._tempId !== tempId),
        deletedDetailIds,
      };
    }),

  startEditing: (id, header, details, modifiedAt = null) =>
    set({
      isEditing: true,
      editingId: id,
      editingModifiedAt: modifiedAt,
      header,
      details,
      deletedDetailIds: [],
    }),

  reset: () =>
    set({
      header: { ...initialHeader },
      details: [],
      isEditing: false,
      editingId: null,
      editingModifiedAt: null,
      deletedDetailIds: [],
    }),
}));
