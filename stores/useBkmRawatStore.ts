import { create } from 'zustand';
import { CreateBkmRawatPayload, CreateDetailBkmRawatPayload, DetailBkmRawatMaterial } from '@/types/bkm-rawat';

interface BkmRawatDetailDraft extends CreateDetailBkmRawatPayload {
  _tempId: string;
  materials: MaterialDraft[];
}

interface MaterialDraft {
  _tempId: string;
  material_id: string;
  jumlah: number;
}

interface BkmRawatDraftState {
  header: CreateBkmRawatPayload;
  details: BkmRawatDetailDraft[];
  isEditing: boolean;
  editingId: string | null;
}

interface BkmRawatStore extends BkmRawatDraftState {
  setHeader: (header: Partial<CreateBkmRawatPayload>) => void;
  addDetail: (detail: CreateDetailBkmRawatPayload) => void;
  updateDetail: (tempId: string, data: Partial<CreateDetailBkmRawatPayload>) => void;
  removeDetail: (tempId: string) => void;
  addMaterial: (detailTempId: string, material: Omit<MaterialDraft, '_tempId'>) => void;
  removeMaterial: (detailTempId: string, materialTempId: string) => void;
  startEditing: (id: string, header: CreateBkmRawatPayload, details: BkmRawatDetailDraft[]) => void;
  reset: () => void;
}

const initialHeader: CreateBkmRawatPayload = {
  kelompok_lahan_id: '',
  blok_id: '',
  lahan_id: '',
  tanggal: '',
  nama_pengawas: '',
};

let detailCounter = 0;
const generateDetailId = () => `temp_rawat_d_${++detailCounter}`;
let materialCounter = 0;
const generateMaterialId = () => `temp_rawat_m_${++materialCounter}`;

export const useBkmRawatStore = create<BkmRawatStore>((set) => ({
  header: { ...initialHeader },
  details: [],
  isEditing: false,
  editingId: null,

  setHeader: (partial) =>
    set((state) => ({ header: { ...state.header, ...partial } })),

  addDetail: (detail) =>
    set((state) => ({
      details: [
        ...state.details,
        { ...detail, _tempId: generateDetailId(), materials: [] },
      ],
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

  addMaterial: (detailTempId, material) =>
    set((state) => ({
      details: state.details.map((d) =>
        d._tempId === detailTempId
          ? {
              ...d,
              materials: [
                ...d.materials,
                { ...material, _tempId: generateMaterialId() },
              ],
            }
          : d
      ),
    })),

  removeMaterial: (detailTempId, materialTempId) =>
    set((state) => ({
      details: state.details.map((d) =>
        d._tempId === detailTempId
          ? {
              ...d,
              materials: d.materials.filter((m) => m._tempId !== materialTempId),
            }
          : d
      ),
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
