import { PendingStatus } from './common';

export interface PendingTimbangLog {
  id: string;
  org_id: string;
  unique_transaction_id: string;
  /** Set when weighed or ticketed by SPB number; a waiting ticket's id is `PKS|<nomor_spb>`. */
  nomor_spb: string | null;
  qr_payload: string;
  nama_supir: string | null;
  nomor_kendaraan: string | null;
  tujuan_kirim: string | null;
  jumlah_janjang_timbang: number;
  jumlah_brondol_timbang: number;
  timbang_isi: string | number | null;
  timbang_kosong: string | number | null;
  tph_id: string | null;
  kelompok_lahan_id: string | null;
  status: PendingStatus;
  error_message: string | null;
  matched_at: string | null;
  created_at: string;
  created_by: string;
}

interface StagingWeighing {
  kendaraan_id?: string;
  supir_id?: string;
  nomor_dokumen?: string;
  keterangan?: string;
  jumlah_brondol?: number;
  kelompok_lahan_id?: string;
  timbang_isi: number;
  timbang_kosong: number;
  /** ISO time the truck was weighed; the server judges the SPB at this moment. */
  weighed_at?: string;
}

/** Legacy V3 QR: it carries no truck data, so the handset sends it. Closes with the V3 window. */
export interface StagingQrPayload extends StagingWeighing {
  qr_payload: string;
  nomor_spb?: undefined;
  nama_supir: string;
  nomor_kendaraan: string;
  tujuan_kirim: string;
}

/** SPB number: truck, driver and destination come from the trip; send them only to override. */
export interface StagingSpbPayload extends StagingWeighing {
  nomor_spb: string;
  qr_payload?: undefined;
  nama_supir?: string;
  nomor_kendaraan?: string;
  tujuan_kirim?: string;
}

export type SubmitStagingPayload = StagingQrPayload | StagingSpbPayload;

/** `202`: no dispatched trip has this SPB yet. Accepted, matched later; do not resend. */
export interface MenungguSpbResponse {
  message: string;
  reconciled: false;
  menunggu_spb: true;
  nomor_spb: string;
  staging_id: string;
}
