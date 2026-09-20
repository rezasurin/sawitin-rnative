import { create } from 'zustand';
import { CreateBkmCheckerPayload, CreateBkmCheckerDetailPayload } from '@/types/bkm-checker';

interface BkmCheckerDetailDraft extends CreateBkmCheckerDetailPayload {
  _tempId: string;
}

interface BkmCheckerDraftState {
  header: CreateBkmCheckerPayload;
  details: BkmCheckerDetailDraft[];
  isEditing: boolean;
  editingId: string | null;
}

interface BkmCheckerStore extends BkmCheckerDraftState {
  setHeader: (header: Partial<CreateBkmCheckerPayload>) => void;
  addDetail: (detail: CreateBkmCheckerDetailPayload) => void;
  updateDetail: (tempId: string, data: Partial<CreateBkmCheckerDetailPayload>) => void;
  removeDetail: (tempId: string) => void;
  startEditing: (id: string, header: CreateBkmCheckerPayload, details: BkmCheckerDetailDraft[]) => void;
  reset: () => void;
}

const initialHeader: CreateBkmCheckerPayload = {
  lahan_id: '',
  tph_id: '',
  blok_id: '',
  tanggal_laporan: '',
};

let tempIdCounter = 0;
const generateTempId = () => `temp_checker_${++tempIdCounter}`;

export const useBkmCheckerStore = create<BkmCheckerStore>((set) => ({
  header: { ...initialHeader },
  details: [],
  isEditing: false,
  editingId: null,

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
    set((state) => ({
      details: state.details.filter((d) => d._tempId !== tempId),
    })),

  startEditing: (id, header, details) =>
    set({ isEditing: true, editingId: id, header, details }),

  reset: () =>
    set({
      header: { ...initialHeader },
      details: [],
      isEditing: false,
      editingId: null,
    }),
}));
