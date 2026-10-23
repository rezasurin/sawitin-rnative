import type { TimestampFields } from './common';
import type { PlantationGeometry } from './geometry';
import type { FotoItem } from '@/utils/foto';

export type JenisObservasi = 'HAMA' | 'PENYAKIT' | 'SENSUS_POKOK' | 'SENSUS_BJR' | 'CURAH_HUJAN' | 'INFRASTRUKTUR' | 'LAINNYA';
export type TingkatObservasi = 'RINGAN' | 'SEDANG' | 'BERAT';

export interface Observasi extends TimestampFields {
  id: string;
  org_id: string;
  client_request_id: string | null;
  jenis: JenisObservasi;
  kelompok_lahan_id: string;
  blok_id: string | null;
  lahan_id: string | null;
  tph_id: string | null;
  tanggal: string;
  nilai: number | null;
  satuan: string | null;
  /** SENSUS_BJR: bunches weighed; `nilai` is their total kg. */
  jumlah_sampel?: number | null;
  tingkat: TingkatObservasi | null;
  nama_pengamat: string;
  catatan: string | null;
  /** Up to five photos, in display order. */
  foto: FotoItem[];
  /** @deprecated Photo 0, kept by the server for older builds. Read `foto`. */
  foto_url?: string | null;
  gps_accuracy: number | null;
  captured_at: string | null;
  geometry: PlantationGeometry | null;
  kelompok_lahan?: { id: string; nama: string };
  blok?: { id: string; nama: string } | null;
  lahan?: { id: string; nama: string } | null;
  tph?: { id: string; nama: string } | null;
}

export type CreateObservasiPayload = Pick<Observasi, 'jenis' | 'kelompok_lahan_id' | 'tanggal' | 'nama_pengamat'> &
  Partial<Pick<Observasi, 'blok_id' | 'lahan_id' | 'tph_id' | 'nilai' | 'satuan' | 'jumlah_sampel' | 'tingkat' | 'catatan' | 'foto' | 'gps_accuracy' | 'captured_at' | 'geometry'>> &
  { client_request_id: string };

export type UpdateObservasiPayload = Partial<Omit<CreateObservasiPayload, 'client_request_id'>>;
