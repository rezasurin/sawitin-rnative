import { DocumentStatus, TimestampFields } from './common';
import { KraniTimbang } from './krani-timbang';
import { HargaTbs } from './harga-tbs';

export interface Penjualan extends TimestampFields {
  id: string;
  org_id: string;
  krani_timbang_id: string;
  tanggal: string;
  netto_kebun: number;
  netto_pabrik: number;
  selisih_susut: number;
  grading_deduction_pct: number;
  harga_tbs_id: string;
  total_bruto: number;
  total_potongan: number;
  total_netto: number;
  status: DocumentStatus;
  keterangan: string | null;
  krani_timbang?: KraniTimbang;
  harga_tbs?: HargaTbs;
}

export interface CreatePenjualanPayload {
  krani_timbang_id: string;
  tanggal: string;
  netto_kebun: number;
  netto_pabrik: number;
  selisih_susut: number;
  grading_deduction_pct: number;
  harga_tbs_id: string;
  total_bruto: number;
  total_potongan: number;
  total_netto: number;
  keterangan?: string;
}

export type UpdatePenjualanPayload = Partial<CreatePenjualanPayload>;
