import { DocumentStatus, TimestampFields } from './common';
import { KelompokLahan, Lahan, Blok, Pekerja, TipePekerjaan, ItemPekerjaan, KategoriPekerjaan } from './master-data';

export interface BkmRawat extends TimestampFields {
  id: string;
  org_id: string;
  kelompok_lahan_id: string;
  lahan_id: string;
  blok_id: string | null;
  tanggal: string;
  nama_pengawas: string;
  status: DocumentStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  kelompok_lahan?: KelompokLahan;
  lahan?: Lahan;
  blok?: Blok;
  details?: DetailBkmRawat[];
}

export interface CreateBkmRawatPayload {
  kelompok_lahan_id: string;
  lahan_id: string;
  blok_id?: string;
  tanggal: string;
  nama_pengawas: string;
}

export type UpdateBkmRawatPayload = Partial<CreateBkmRawatPayload>;

export interface DetailBkmRawat extends TimestampFields {
  id: string;
  bkm_rawat_id: string;
  pekerja_id: string | null;
  nama_pekerja: string;
  jumlah_pekerja: number;
  tipe_pekerjaan_id: string;
  item_pekerjaan_id: string;
  kategori_pekerjaan_id: string;
  satuan_hasil: string | null;
  hasil_pekerjaan: number | null;
  keterangan: string | null;
  pekerja?: Pekerja;
  tipe_pekerjaan?: TipePekerjaan;
  item_pekerjaan?: ItemPekerjaan;
  kategori_pekerjaan?: KategoriPekerjaan;
  materials?: DetailBkmRawatMaterial[];
}

export interface CreateDetailBkmRawatPayload {
  bkm_rawat_id: string;
  pekerja_id?: string;
  nama_pekerja: string;
  jumlah_pekerja: number;
  tipe_pekerjaan_id: string;
  item_pekerjaan_id: string;
  kategori_pekerjaan_id: string;
  satuan_hasil?: string;
  hasil_pekerjaan?: number;
  keterangan?: string;
}

export type UpdateDetailBkmRawatPayload = Partial<Omit<CreateDetailBkmRawatPayload, 'bkm_rawat_id'>>;

export interface DetailBkmRawatMaterial extends TimestampFields {
  id: string;
  detail_bkm_rawat_id: string;
  material_id: string;
  jumlah: number;
}

export type BkmRawatDetail = DetailBkmRawat;
export type CreateBkmRawatDetailPayload = CreateDetailBkmRawatPayload;
export type UpdateBkmRawatDetailPayload = UpdateDetailBkmRawatPayload;
