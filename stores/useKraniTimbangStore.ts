import { create } from 'zustand';
import { CreateKraniTimbangPayload, CreateDetailKraniTimbangPayload } from '@/types/krani-timbang';

interface KraniTimbangDetailDraft extends CreateDetailKraniTimbangPayload {
  _tempId: string;
}

interface KraniTimbangDraftState {
  header: CreateKraniTimbangPayload;
  details: KraniTimbangDetailDraft[];
  isEditing: boolean;
  editingId: string | null;
}

interface KraniTimbangStore extends KraniTimbangDraftState {
  setHeader: (header: Partial<CreateKraniTimbangPayload>) => void;
  addDetail: (detail: CreateDetailKraniTimbangPayload) => void;
  updateDetail: (tempId: string, data: Partial<CreateDetailKraniTimbangPayload>) => void;
  removeDetail: (tempId: string) => void;
  startEditing: (id: string, header: CreateKraniTimbangPayload, details: KraniTimbangDetailDraft[]) => void;
  calculateNetto: () => number;
  reset: () => void;
}

const initialHeader: CreateKraniTimbangPayload = {
  nama_supir: '',
  nomor_kendaraan: '',
  tujuan_kirim: '',
  tanggal: '',
};

let tempIdCounter = 0;
const generateTempId = () => `temp_kt_${++tempIdCounter}`;

export const useKraniTimbangStore = create<KraniTimbangStore>((set, get) => ({
  header: { ...initialHeader },
  details: [],
  isEditing: false,
  editingId: null,

  setHeader: (partial) =>
    set((state) => {
      const updated = { ...state.header, ...partial };
      const timbangKosong = updated.timbang_kosong ?? 0;
      const timbangIsi = updated.timbang_isi ?? 0;
      if (partial.timbang_kosong !== undefined || partial.timbang_isi !== undefined) {
        updated.netto = timbangIsi - timbangKosong;
      }
      return { header: updated };
    }),

  addDetail: (detail) =>
    set((state) => ({
      details: [...state.details, { ...detail, _tempId: generateTempId() }],
    })),

  updateDetail: (tempId, data) =>
    set((state) => ({
      details: state.details.map((d) =>
        d._tempId === tempId ? { ...d, ...data } : d
      ),
    })),

  removeDetail: (tempId) =>
    set((state) => ({
      details: state.details.filter((d) => d._tempId !== tempId),
    })),

  startEditing: (id, header, details) =>
    set({ isEditing: true, editingId: id, header, details }),

  calculateNetto: () => {
    const { header } = get();
    return (header.timbang_isi ?? 0) - (header.timbang_kosong ?? 0);
  },

  reset: () =>
    set({
      header: { ...initialHeader },
      details: [],
      isEditing: false,
      editingId: null,
    }),
}));
