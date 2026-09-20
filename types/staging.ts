import { PendingStatus } from './common';

export interface PendingTimbangLog {
  id: string;
  org_id: string;
  unique_transaction_id: string;
  qr_payload: string;
  nama_supir: string | null;
  nomor_kendaraan: string | null;
  tujuan_kirim: string | null;
  jumlah_janjang_timbang: number;
  jumlah_brondol_timbang: number;
  tph_id: string | null;
  kelompok_lahan_id: string | null;
  status: PendingStatus;
  error_message: string | null;
  matched_at: string | null;
  created_at: string;
  created_by: string;
}

export interface SubmitStagingPayload {
  qr_payload: string;
  nama_supir: string;
  nomor_kendaraan: string;
  tujuan_kirim: string;
  keterangan?: string;
  jumlah_brondol?: number;
  kelompok_lahan_id?: string;
  timbang_isi: number;
  timbang_kosong: number;
}
