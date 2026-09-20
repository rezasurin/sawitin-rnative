import { DocumentStatus, TimestampFields } from "./common";
import { Blok, GrupPekerja, Lahan, Pekerja, Tph } from "./master-data";

export interface BkmPanen extends TimestampFields {
  id: string;
  org_id: string;
  lahan_id: string;
  blok_id: string | null;
  grup_pekerja_id: string | null;
  tanggal_laporan: string;
  keterangan: string | null;
  status: DocumentStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  lahan?: Lahan;
  blok?: Blok;
  grup_pekerja?: GrupPekerja;
  details?: BkmPanenDetail[];
}

export interface CreateBkmPanenPayload {
  client_request_id?: string;
  lahan_id?: string;
  blok_id: string;
  grup_pekerja_id?: string;
  tanggal_laporan: string;
  keterangan?: string;
}

export type UpdateBkmPanenPayload = Partial<CreateBkmPanenPayload> & {
  status?: DocumentStatus;
};

export interface BkmPanenDetail extends TimestampFields {
  id: string;
  bkm_panen_id: string;
  pekerja_id: string;
  tph_id: string;
  jenis_pekerjaan: string;
  janjang_normal: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
  jumlah_brondol: number | null;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  pekerja?: Pekerja;
  tph?: Tph;
}

export interface CreateBkmPanenDetailPayload {
  client_detail_id?: string;
  bkm_panen_id: string;
  pekerja_id: string;
  tph_id: string;
  jenis_pekerjaan: string;
  janjang_normal: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
  jumlah_brondol?: number;
  foto_url?: string;
  lat?: number;
  lng?: number;
  note?: string;
}

export type UpdateBkmPanenDetailPayload = Partial<
  Omit<CreateBkmPanenDetailPayload, "bkm_panen_id">
>;
