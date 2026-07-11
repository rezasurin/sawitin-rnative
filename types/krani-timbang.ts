import { DocumentStatus, OriginSource, TimestampFields } from './common';
import { KelompokLahan, Tph, Supir, Kendaraan } from './master-data';

export interface KraniTimbang extends TimestampFields {
  id: string;
  org_id: string;
  nomor_dokumen: string | null;
  nama_supir: string;
  nomor_kendaraan: string;
  supir_id: string | null;
  kendaraan_id: string | null;
  pending_log_id: string | null;
  tujuan_kirim: string;
  tanggal: string;
  timbang_kosong: number | null;
  timbang_isi: number | null;
  netto: number | null;
  status: DocumentStatus;
  keterangan: string | null;
  origin_source: OriginSource;
  supir?: Supir;
  kendaraan?: Kendaraan;
  details?: DetailKraniTimbang[];
}

export interface CreateKraniTimbangPayload {
  nama_supir: string;
  nomor_kendaraan: string;
  supir_id?: string;
  kendaraan_id?: string;
  tujuan_kirim: string;
  tanggal: string;
  timbang_kosong?: number;
  timbang_isi?: number;
  netto?: number;
  keterangan?: string;
  origin_source?: OriginSource;
}

export type UpdateKraniTimbangPayload = Partial<CreateKraniTimbangPayload>;

export interface DetailKraniTimbang extends TimestampFields {
  id: string;
  krani_timbang_id: string;
  kelompok_lahan_id: string;
  tph_id: string;
  jumlah_brondol: number;
  jumlah_janjang: number;
  kelompok_lahan?: KelompokLahan;
  tph?: Tph;
}

export interface CreateDetailKraniTimbangPayload {
  krani_timbang_id: string;
  kelompok_lahan_id: string;
  tph_id: string;
  jumlah_brondol: number;
  jumlah_janjang: number;
}

export type UpdateDetailKraniTimbangPayload = Partial<Omit<CreateDetailKraniTimbangPayload, 'krani_timbang_id'>>;

export interface KraniTimbangChecker {
  id: string;
  krani_timbang_id: string;
  bkm_checker_id: string;
  created_at: string;
  created_by: string;
}

export type KraniTimbangDetail = DetailKraniTimbang;
export type CreateKraniTimbangDetailPayload = CreateDetailKraniTimbangPayload;
export type UpdateKraniTimbangDetailPayload = UpdateDetailKraniTimbangPayload;
