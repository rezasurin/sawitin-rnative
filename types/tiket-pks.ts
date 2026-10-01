import type { PaginatedResponse, TimestampFields } from './common';

export interface TiketPks extends TimestampFields {
  id: string;
  org_id: string;
  krani_timbang_id: string;
  nomor_tiket: string;
  tanggal_tiket: string;
  bruto_pabrik: string | number | null;
  tara_pabrik: string | number | null;
  netto_pabrik: string | number;
  foto_url: string | null;
  diterima_oleh: string | null;
  keterangan: string | null;
}

/** The ticket's own fields; the trip is named by `krani_timbang_id` or, in the pilot, by `nomor_spb`. */
export interface TiketPksFields {
  nomor_tiket: string;
  tanggal_tiket: string;
  bruto_pabrik?: number | null;
  tara_pabrik?: number | null;
  netto_pabrik: number;
  foto_url?: string | null;
  diterima_oleh?: string | null;
  keterangan?: string | null;
}

export interface CreateTiketPksPayload extends TiketPksFields { krani_timbang_id: string }
export interface CreateTiketPksBySpbPayload extends TiketPksFields { nomor_spb: string }

export type UpdateTiketPksPayload = Partial<TiketPksFields>;
export type TiketPksList = PaginatedResponse<TiketPks>;
