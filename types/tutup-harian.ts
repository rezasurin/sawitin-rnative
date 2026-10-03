import type { DocumentStatus } from './common';

/** Contract: sawitin-backend docs/frontend-notes/trip-spb-phase-5-daily-close.md */

export type CloseExceptionSeverity = 'BLOCKING' | 'NOTE';

export interface CloseException {
  code: string;
  severity: CloseExceptionSeverity;
  /** `<code>:<id>`: what a note is filed under. */
  key: string;
  message: string;
  ref: Record<string, unknown>;
  /** The note already filed for this exception. */
  catatan: string | null;
}

export interface CloseTph {
  tph_id: string;
  nama: string;
  blok_id: string;
  panen_janjang: number;
  panen_brondol_kg: number;
  langsung_janjang: number;
  langsung_brondol_kg: number;
  titip_janjang: number;
  restan_usulan_janjang: number;
  restan_usulan_brondol_kg: number;
  restan_hitung_janjang: number | null;
  restan_hitung_brondol_kg: number | null;
  selisih_janjang: number;
}

export interface CloseTrip {
  id: string;
  nomor_spb: string | null;
  bentuk: 'TRIP' | 'LAMA';
  status: DocumentStatus;
  dispatched_at: string | null;
  nomor_truk: string | null;
  nama_sopir: string | null;
  jumlah_janjang: number;
  brondol_kg: number;
  ditimbang: boolean;
  netto_acuan: number | null;
  netto_sumber: 'INTERNAL' | 'PKS' | null;
  bjr_aktual: number | null;
}

export interface CloseBrondol {
  blok_id: string;
  nama: string;
  janjang: number;
  brondol_kg: number;
  bjr: number;
  pct: number;
  band: 'BELOW_BAND' | 'IN_BAND' | 'ABOVE_BAND';
  hint: string | null;
}

export interface CloseRestan {
  id: string;
  tph_id: string;
  tanggal: string;
  jumlah_janjang: number;
  jumlah_brondol_kg: number;
  sudah_dikirim: boolean;
  tanggal_kirim: string | null;
  status: DocumentStatus;
}

export interface CloseRecord {
  id: string;
  status: DocumentStatus;
  catatan: string | null;
  created_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
}

export interface TutupHarianPreview {
  source: 'LIVE' | 'SNAPSHOT';
  kelompok_lahan_id: string;
  tanggal: string;
  batas_approval_at: string;
  terlambat: boolean;
  tutup_harian: CloseRecord | null;
  tph: CloseTph[];
  restan_diambil: { line_id: string; restan_id: string; tph_id: string; nomor_spb: string | null; jumlah_janjang: number; jumlah_brondol_kg: number }[];
  trips: CloseTrip[];
  restan: CloseRestan[];
  brondol: CloseBrondol[];
  exceptions: CloseException[];
  ringkasan: { blocking: number; perlu_catatan: number; bisa_diajukan: boolean };
}

export interface CloseListItem {
  id: string;
  kelompok_lahan_id: string;
  kelompok_lahan: { id: string; nama: string };
  tanggal: string;
  status: DocumentStatus;
  catatan: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
}

export interface SubmitClosePayload {
  kelompok_lahan_id: string;
  tanggal: string;
  restan: { tph_id: string; jumlah_janjang: number; jumlah_brondol: number }[];
  catatan?: string;
  catatan_pengecualian: Record<string, string>;
}
