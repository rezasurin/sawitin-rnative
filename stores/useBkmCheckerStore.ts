import { create } from 'zustand';
import { estateDate } from '@/utils/estateDate';
import type { TripHeaderDraft, TripLineDraft } from '@/types/bkm-checker';

export interface TripLine extends TripLineDraft {
  _tempId: string;
}

interface BkmCheckerStore {
  header: TripHeaderDraft;
  details: TripLine[];
  setHeader: (header: Partial<TripHeaderDraft>) => void;
  addDetail: (detail: TripLineDraft) => void;
  updateDetail: (tempId: string, data: Partial<TripLineDraft>) => void;
  removeDetail: (tempId: string) => void;
  reset: () => void;
}

/** A new trip starts on today's estate day, never the device's. */
const initialHeader = (): TripHeaderDraft => ({
  nomor_spb: '',
  tanggal: estateDate(),
  kendaraan_id: '',
  supir_id: '',
  nomor_truk: '',
  nama_sopir: '',
  tujuan_kirim: '',
  keterangan: '',
});

let tempIdCounter = 0;
const generateTempId = () => `temp_checker_${++tempIdCounter}`;

/** The pieces of the janjang total, so the line always adds up to what was graded. */
const total = (line: TripLineDraft) =>
  line.janjang_normal + line.buah_mentah + line.over_ripe + line.tangkai_panjang + line.buah_abnormal + line.janjang_kosong;

export const useBkmCheckerStore = create<BkmCheckerStore>((set) => ({
  header: initialHeader(),
  details: [],

  setHeader: (partial) => set((state) => ({ header: { ...state.header, ...partial } })),

  addDetail: (detail) =>
    set((state) => ({ details: [...state.details, { ...detail, jumlah_janjang: total(detail), _tempId: generateTempId() }] })),

  updateDetail: (tempId, data) =>
    set((state) => ({
      details: state.details.map((d) => {
        if (d._tempId !== tempId) return d;
        const updated = { ...d, ...data };
        return { ...updated, jumlah_janjang: total(updated) };
      }),
    })),

  removeDetail: (tempId) => set((state) => ({ details: state.details.filter((d) => d._tempId !== tempId) })),

  reset: () => set({ header: initialHeader(), details: [] }),
}));
