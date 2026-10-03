export interface SummaryMeasure {
  janjang: number;
  kg_estimasi: number | null;
  kg_estimasi_total: number | null;
}

export interface RestanMeasure {
  janjang: number;
  baris: number;
  umur_tertua_hari?: number | null;
}

export interface ApprovalSummary {
  dokumen: string;
  modul: string;
  menunggu: number;
  umur: { '<1': number; '1-3': number; '>3': number };
  tertua_hari: number | null;
  dikembalikan: number;
  /** R11 v2: a daily close past 12:00 on the next day; null for other documents. */
  terlambat?: number | null;
}

export interface FieldSummary {
  definition: { id: 'R11'; version: number };
  generated_at: string;
  tanggal: string;
  timezone: string;
  bjr_used: number | null;
  kelompok_lahan_id: string | null;
  produksi: { approved: SummaryMeasure; submitted: SummaryMeasure };
  restan: { approved: RestanMeasure; submitted: RestanMeasure };
  persetujuan: ApprovalSummary[];
}
