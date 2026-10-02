import { DocumentStatus, TimestampFields } from "./common";
import { Blok, GrupPekerja, Lahan, Pekerja, Tph } from "./master-data";

export interface BkmPanen extends TimestampFields {
  id: string;
  org_id: string;
  /** The offline id the phone created it under, when it came from the queue. */
  client_request_id?: string | null;
  lahan_id: string;
  blok_id: string | null;
  grup_pekerja_id: string | null;
  tanggal_laporan: string;
  keterangan: string | null;
  status: DocumentStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  /** Why fruit was harvested on TBM land; required by the server from phase 4. */
  alasan_tbm?: string | null;
  lahan?: Lahan;
  blok?: Blok;
  grup_pekerja?: GrupPekerja;
  details?: BkmPanenDetail[];
}

export interface CreateBkmPanenPayload {
  client_request_id?: string;
  lahan_id?: string;
  blok_id: string;
  grup_pekerja_id?: string;
  tanggal_laporan: string;
  keterangan?: string;
  /** Required before queueing when the land is TBM on `tanggal_laporan`. */
  alasan_tbm?: string;
}

export type UpdateBkmPanenPayload = Partial<CreateBkmPanenPayload> & {
  status?: DocumentStatus;
};

export interface BkmPanenDetail extends TimestampFields {
  id: string;
  bkm_panen_id: string;
  pekerja_id: string;
  tph_id: string;
  jenis_pekerjaan: string;
  janjang_normal: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
  jumlah_brondol: number | null;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
  /** Fix radius in metres, as the platform reported it. */
  gps_accuracy: number | null;
  /** When the device read the position — not when the row was uploaded. */
  captured_at: string | null;
  foto_hash: string | null;
  foto_bytes: number | null;
  /** Evaluated by the server against the mapped parcel, then the block. */
  geofence_status: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | null;
  geofence_override_reason: string | null;
  note: string | null;
  pekerja?: Pekerja;
  tph?: Tph;
}

export interface CreateBkmPanenDetailPayload {
  client_detail_id?: string;
  bkm_panen_id: string;
  pekerja_id: string;
  tph_id: string;
  jenis_pekerjaan: string;
  janjang_normal: number;
  buah_mentah: number;
  over_ripe: number;
  tangkai_panjang: number;
  buah_abnormal: number;
  janjang_kosong: number;
  jumlah_janjang: number;
  jumlah_brondol?: number;
  foto_url?: string;
  lat?: number;
  lng?: number;
  gps_accuracy?: number;
  captured_at?: string;
  foto_hash?: string;
  foto_bytes?: number;
  /**
   * Optional. The server records an out-of-bounds position rather than
   * rejecting it, so never block a save on collecting this.
   */
  geofence_override_reason?: string;
  note?: string;
}

export type UpdateBkmPanenDetailPayload = Partial<
  Omit<CreateBkmPanenDetailPayload, "bkm_panen_id">
>;
