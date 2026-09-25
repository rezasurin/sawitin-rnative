import type { DocumentStatus, GlobalStatus, TimestampFields } from './common';

export interface Kendaraan extends TimestampFields {
  id: string; org_id: string; nomor_kendaraan: string; jenis_kendaraan: string;
  kapasitas: number | null; status: GlobalStatus;
}
export interface Supir extends TimestampFields {
  id: string; org_id: string; nama: string; kontak: string | null;
  ktp: string | null; alamat: string | null; status: GlobalStatus;
}
export interface PemakaianKendaraan extends TimestampFields {
  id: string; org_id: string; client_request_id: string | null;
  kendaraan_id: string; supir_id: string | null; pekerja_id: string | null;
  bkm_rawat_id: string | null; tanggal: string;
  meter_awal: number | null; meter_akhir: number | null; satuan_meter: string | null;
  material_id: string | null; jumlah_bbm: number | null; keterangan: string | null;
  status: DocumentStatus; rejection_note: string | null;
  kendaraan?: Pick<Kendaraan, 'id' | 'nomor_kendaraan' | 'jenis_kendaraan'>;
  supir?: Pick<Supir, 'id' | 'nama'> | null;
  material?: { id: string; nama: string; satuan: string } | null;
}
export type CreatePemakaianKendaraanPayload = Pick<PemakaianKendaraan, 'kendaraan_id' | 'tanggal'> &
  Partial<Pick<PemakaianKendaraan, 'supir_id' | 'pekerja_id' | 'bkm_rawat_id' | 'meter_awal' | 'meter_akhir' | 'satuan_meter' | 'material_id' | 'jumlah_bbm' | 'keterangan'>> &
  { client_request_id: string };
