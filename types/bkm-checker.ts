import { DocumentStatus, TipePengiriman, TimestampFields } from './common';
import { Lahan, Blok, Tph, Pekerja } from './master-data';

export interface BkmChecker extends TimestampFields {
  id: string;
  org_id: string;
  lahan_id: string | null;
  tph_id: string;
  blok_id: string;
  bkm_panen_id: string | null;
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
  tph?: Tph;
  details?: BkmCheckerDetail[];
}

export interface CreateBkmCheckerPayload {
  client_request_id?: string;
  lahan_id?: string;
  tph_id: string;
  blok_id: string;
  bkm_panen_id?: string;
  tanggal_laporan: string;
  keterangan?: string;
}

export type UpdateBkmCheckerPayload = Partial<CreateBkmCheckerPayload> & {
  status?: DocumentStatus;
};

export interface BkmCheckerDetail extends TimestampFields {
  id: string;
  bkm_checker_id: string;
  pekerja_id: string | null;
  nomor_truk: string | null;
  nama_sopir: string | null;
  tipe_pengiriman: TipePengiriman;
  tujuan_kirim: string | null;
  janjang_normal: number;
  jumlah_brondol: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
  pekerja?: Pekerja;
}

export interface CreateBkmCheckerDetailPayload {
  client_detail_id?: string;
  bkm_checker_id: string;
  pekerja_id?: string;
  nomor_truk?: string;
  nama_sopir?: string;
  tipe_pengiriman: TipePengiriman;
  tujuan_kirim?: string;
  janjang_normal: number;
  jumlah_brondol: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
}

export type UpdateBkmCheckerDetailPayload = Partial<Omit<CreateBkmCheckerDetailPayload, 'bkm_checker_id'>>;
