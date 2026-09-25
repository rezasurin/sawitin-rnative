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

export interface CreateTiketPksPayload {
  krani_timbang_id: string;
  nomor_tiket: string;
  tanggal_tiket: string;
  bruto_pabrik?: number | null;
  tara_pabrik?: number | null;
  netto_pabrik: number;
  foto_url?: string | null;
  diterima_oleh?: string | null;
  keterangan?: string | null;
}

export type UpdateTiketPksPayload = Partial<Omit<CreateTiketPksPayload, 'krani_timbang_id'>>;
export type TiketPksList = PaginatedResponse<TiketPks>;
