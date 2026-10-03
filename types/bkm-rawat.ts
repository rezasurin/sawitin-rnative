import { DocumentStatus, TimestampFields } from './common';
import { KelompokLahan, Lahan, Blok, Pekerja, TipePekerjaan, ItemPekerjaan, KategoriPekerjaan } from './master-data';

export interface BkmRawat extends TimestampFields {
  id: string;
  org_id: string;
  client_request_id?: string | null;
  kelompok_lahan_id: string;
  lahan_id: string | null;
  blok_id: string;
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
  detail_rawat?: DetailBkmRawat[];
}

export interface CreateBkmRawatPayload {
  client_request_id?: string;
  kelompok_lahan_id: string;
  lahan_id?: string;
  blok_id: string;
  tanggal: string;
  nama_pengawas: string;
  details?: Omit<CreateDetailBkmRawatPayload, 'bkm_rawat_id'>[];
}

export type UpdateBkmRawatPayload = Partial<CreateBkmRawatPayload> & { status?: DocumentStatus };

export interface DetailBkmRawat extends TimestampFields {
  id: string;
  bkm_rawat_id: string;
  client_detail_id?: string | null;
  pekerja_id: string | null;
  nama_pekerja: string;
  jumlah_pekerja: number;
  tipe_pekerjaan_id: string;
  item_pekerjaan_id: string;
  kategori_pekerjaan_id: string;
  satuan_hasil: string | null;
  hasil_pekerjaan: number | null;
  luas_ha: number | null;
  jumlah_pokok: number | null;
  metode: string | null;
  kondisi: string | null;
  keterangan: string | null;
  pekerja?: Pekerja;
  tipe_pekerjaan?: TipePekerjaan;
  item_pekerjaan?: ItemPekerjaan;
  kategori_pekerjaan?: KategoriPekerjaan;
  materials?: DetailBkmRawatMaterial[];
}

export interface CreateDetailBkmRawatPayload {
  client_detail_id?: string;
  bkm_rawat_id: string;
  pekerja_id?: string;
  nama_pekerja: string;
  jumlah_pekerja: number;
  tipe_pekerjaan_id: string;
  item_pekerjaan_id: string;
  kategori_pekerjaan_id: string;
  satuan_hasil?: string;
  hasil_pekerjaan?: number;
  luas_ha?: number;
  jumlah_pokok?: number;
  metode?: string;
  kondisi?: string;
  keterangan?: string;
  materials?: { material_id: string; jumlah: number; dosis?: number; satuan_dosis?: string }[];
}

export type UpdateDetailBkmRawatPayload = Partial<Omit<CreateDetailBkmRawatPayload, 'bkm_rawat_id'>>;

export interface BkmRawatLookups {
  types: { id: string; nama: string }[];
  categories: { id: string; nama: string }[];
  items: { id: string; nama: string; kategori_pekerjaan_id: string }[];
  materials: { id: string; nama: string; satuan: string; bahan_aktif?: string | null; konsentrasi?: string | null }[];
  vehicles?: { id: string; nomor_kendaraan: string; jenis_kendaraan: string; status: 'ACTIVE' | 'INACTIVE' }[];
  drivers?: { id: string; nama: string; status: 'ACTIVE' | 'INACTIVE' }[];
  groups: { id: string; nama: string }[];
  blocks: { id: string; nama: string; kelompok_lahan_id: string }[];
  lands: { id: string; nama: string; blok_id: string | null }[];
}

export interface QueuedBkmRawatPayload {
  header: Omit<CreateBkmRawatPayload, 'client_request_id' | 'details'>;
  details: Omit<CreateDetailBkmRawatPayload, 'bkm_rawat_id'>[];
  submit: boolean;
  display?: {
    kelompok_lahan_nama?: string;
    blok_nama?: string;
    lahan_nama?: string;
  };
}

export interface DetailBkmRawatMaterial extends TimestampFields {
  id: string;
  detail_bkm_rawat_id: string;
  material_id: string;
  jumlah: number;
  dosis: number | null;
  satuan_dosis: string | null;
  material?: { id: string; nama: string; satuan: string; bahan_aktif?: string | null; konsentrasi?: string | null };
}

export type BkmRawatDetail = DetailBkmRawat;
export type CreateBkmRawatDetailPayload = CreateDetailBkmRawatPayload;
export type UpdateBkmRawatDetailPayload = UpdateDetailBkmRawatPayload;
