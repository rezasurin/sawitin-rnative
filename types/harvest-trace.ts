import type { TiketPks } from './tiket-pks';

export type TraceWeight = string | null;
export interface TraceGrade {
  janjang_normal: number; buah_mentah: number; over_ripe: number;
  tangkai_panjang: number; buah_abnormal: number; janjang_kosong: number;
  jumlah_janjang: number; breakdown_total: number; reconciles: boolean;
}
/** One trip line (P6-BE-06): where it loaded and what it carried. */
export interface TraceLine {
  id: string; bkm_checker_id: string; nomor_spb: string | null;
  tipe_pengiriman: 'LANGSUNG' | 'TITIP' | 'RESTAN';
  tph: { id: string; nama: string } | null; blok: { id: string; nama: string } | null;
  jumlah_janjang: number; jumlah_brondol: number;
  bkm_panen_id: string | null;
  /** `<bkm_panen_id>|<tph_id>`; joins to `panen`. Null on a TITIP line. */
  panen_pair: string | null;
  restan_diambil: { id: string; tanggal: string } | null;
}
/** The harvest of one (Panen, TPH) pair, listed once however many lines drew on it. */
export interface TracePanen {
  pair: string; bkm_panen_id: string; tph: { id: string; nama: string } | null;
  tanggal_laporan: string; status: string; jumlah_janjang: number;
}
export interface HarvestTrace {
  trip: {
    id: string; nomor_dokumen: string | null; nomor_spb?: string | null; tanggal: string; tujuan_kirim: string;
    status: string; origin_source: string; nomor_kendaraan: string; nama_supir: string;
    kendaraan?: { nomor_kendaraan: string } | null; supir?: { nama: string } | null;
    approved_by?: string | null; approved_at?: string | null;
  };
  /** Absent on a server older than phase 6; the screen then falls back to `sources`. */
  lines?: TraceLine[];
  panen?: TracePanen[];
  sources: { bkm_checker: {
    id: string; status: string; blok?: { nama: string } | null;
    lahan?: { nama: string } | null; tph?: { nama: string } | null;
    approved_by?: string | null; details: unknown[];
  }; bkm_panen: { id: string; details: unknown[] } | null }[];
  workers: { id: string; nama: string | null }[];
  evidence: { source: string; id: string; tph: { nama: string } | null;
    foto_url: string | null; lat: number | null; lng: number | null }[];
  quantities: {
    janjang: { panen: number; checker_total: number; checker_loaded: number;
      checker_restan: number; weighed: number; restan_left_at_source: number;
      restan_carried_from_earlier: number };
    brondol: { checker: number; weighed: number; restan_left_at_source: number;
      restan_carried_from_earlier: number };
    berat_kg: { internal_bruto: TraceWeight; internal_tara: TraceWeight;
      internal_netto: TraceWeight; pks_bruto: TraceWeight; pks_tara: TraceWeight;
      pks_netto: TraceWeight; susut: TraceWeight; sale_netto_pabrik: TraceWeight;
      netto_acuan?: TraceWeight; netto_sumber?: 'INTERNAL' | 'PKS' | null };
    grading: { checker: TraceGrade; panen: TraceGrade };
  };
  restan: { left_at_source: unknown[]; carried_from_earlier: unknown[] };
  pks_ticket: TiketPks | null;
  sale: { id: string; netto_pabrik: string | number } | null;
  flags: { code: string; detail: string }[];
  history: { id: string; document_type: string; action: string;
    created_at: string; created_by: string }[];
}
