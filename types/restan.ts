import { DocumentStatus, TimestampFields } from './common';
import { KelompokLahan, Tph } from './master-data';

export interface Restan extends TimestampFields {
  id: string;
  org_id: string;
  kelompok_lahan_id: string;
  tph_id: string;
  bkm_checker_detail_id: string | null;
  tutup_harian_id?: string | null;
  tanggal: string;
  jumlah_brondol: number;
  jumlah_janjang: number;
  sudah_dikirim: boolean;
  tanggal_kirim: string | null;
  dokumen_kirim_id: string | null;
  status: DocumentStatus;
  kelompok_lahan?: KelompokLahan;
  tph?: Tph;
}
