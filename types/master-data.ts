import { GlobalStatus, TimestampFields } from './common';
import type { MappedRecord } from './geometry';

export interface Organization {
  id: string;
  name: string;
  plan_type: string;
  settings: Record<string, unknown> | null;
  status: GlobalStatus;
}

export interface Member extends TimestampFields {
  /** Farm's person code, distinct from nik; absent in older cached records. */
  kode?: string | null;
  id: string;
  org_id: string;
  nama: string;
  email: string | null;
  phone_number: string | null;
  nik: string | null;
  address: string | null;
  emergency_contact: string | null;
  birth_date: string | null;
  join_date: string | null;
  status: GlobalStatus;
}

export interface CreateMemberPayload {
  nama: string;
  email?: string;
  phone_number?: string;
  nik?: string;
  address?: string;
  emergency_contact?: string;
  birth_date?: string;
  join_date?: string;
  status?: GlobalStatus;
}

export type UpdateMemberPayload = Partial<CreateMemberPayload>;

export interface KelompokLahan extends TimestampFields, MappedRecord {
  id: string;
  org_id: string;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
}

export interface CreateKelompokLahanPayload extends MappedRecord {
  nama: string;
  deskripsi?: string;
  status?: GlobalStatus;
}

export type UpdateKelompokLahanPayload = Partial<CreateKelompokLahanPayload>;

/** Server-derived values; absent in caches written by pre-Phase-2 builds. */
export interface AgronomyMetadata {
  varietas?: string | null;
  umur_tanam?: number | null;
  maturitas?: 'TBM' | 'TM' | 'TUA' | null;
}

export interface Lahan extends TimestampFields, AgronomyMetadata, MappedRecord {
  id: string;
  org_id: string;
  user_pic_id: string | null;
  member_id: string;
  blok_id: string | null;
  nama: string;
  deskripsi: string | null;
  luas_lahan: number | null;
  nama_pemilik: string | null;
  alamat: string | null;
  tipe_dokumen: string | null;
  nama_dokumen: string | null;
  url_dokumen: string | null;
  tanggal_dokumen: string | null;
  status_pemilik: string | null;
  /** Legacy coordinates are read-only, in latitude/longitude order. */
  koordinat_lokasi: number[] | null;
  tahun_tanam?: number | null;
  jumlah_pokok?: number | null;
  status: GlobalStatus;
  blok?: Blok;
  member?: Member;
}

export interface CreateLahanPayload extends MappedRecord {
  user_pic_id?: string | null;
  member_id: string;
  blok_id?: string | null;
  nama: string;
  deskripsi?: string;
  luas_lahan?: number;
  nama_pemilik?: string;
  alamat?: string;
  tipe_dokumen?: string;
  nama_dokumen?: string;
  url_dokumen?: string;
  tanggal_dokumen?: string;
  status_pemilik?: string;
  tahun_tanam?: number;
  jumlah_pokok?: number;
  varietas?: string;
  status?: GlobalStatus;
}

export type UpdateLahanPayload = Partial<CreateLahanPayload>;

export interface Blok extends TimestampFields, AgronomyMetadata, MappedRecord {
  id: string;
  org_id: string;
  kelompok_lahan_id: string;
  nama: string;
  deskripsi: string | null;
  luas_blok: number | null;
  luas_planted: number | null;
  luas_unplanted: number | null;
  jumlah_pokok: number | null;
  tahun_tanam: number | null;
  tahun_panen: number | null;
  status: GlobalStatus;
  kelompok_lahan?: KelompokLahan;
}

export interface CreateBlokPayload extends MappedRecord {
  kelompok_lahan_id: string;
  nama: string;
  deskripsi?: string;
  luas_blok?: number;
  luas_planted?: number;
  luas_unplanted?: number;
  jumlah_pokok?: number;
  tahun_tanam?: number;
  varietas?: string;
  tahun_panen?: number;
  status?: GlobalStatus;
}

export type UpdateBlokPayload = Partial<CreateBlokPayload>;

export interface Tph extends TimestampFields, MappedRecord {
  id: string;
  org_id: string;
  lahan_id: string;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
  basis_jjg_perbulan: number;
  basis_jjg_perhari: number;
  lahan?: Lahan;
}

export interface CreateTphPayload extends MappedRecord {
  lahan_id: string;
  nama: string;
  deskripsi?: string;
  basis_jjg_perbulan: number;
  basis_jjg_perhari: number;
  status?: GlobalStatus;
}

export type UpdateTphPayload = Partial<CreateTphPayload>;

export interface TipePekerjaan extends TimestampFields {
  id: string;
  org_id: string | null;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
}

export interface CreateTipePekerjaanPayload {
  nama: string;
  deskripsi?: string;
  status?: GlobalStatus;
}

export type UpdateTipePekerjaanPayload = Partial<CreateTipePekerjaanPayload>;

export interface Pekerja extends TimestampFields {
  id: string;
  org_id: string;
  member_id: string;
  join_date: string | null;
  status: GlobalStatus;
  member?: Member;
}

export interface CreatePekerjaPayload {
  member_id: string;
  join_date?: string;
  status?: GlobalStatus;
  selectedTipePekerjaanID?: string[];
  selectedGrupPekerjaID?: string[];
}

export type UpdatePekerjaPayload = Partial<CreatePekerjaPayload>;

export interface GrupPekerja extends TimestampFields {
  id: string;
  org_id: string;
  blok_id: string | null;
  mandor_id: string;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
  blok?: Blok;
}

export interface CreateGrupPekerjaPayload {
  blok_id?: string;
  mandor_id: string;
  nama: string;
  deskripsi?: string;
  status?: GlobalStatus;
}

export type UpdateGrupPekerjaPayload = Partial<CreateGrupPekerjaPayload>;

export interface KategoriPekerjaan extends TimestampFields {
  id: string;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
}

export interface ItemPekerjaan extends TimestampFields {
  id: string;
  nama: string;
  kategori_pekerjaan_id: string;
  deskripsi: string | null;
  status: GlobalStatus;
  keterangan: string | null;
  kategori_pekerjaan?: KategoriPekerjaan;
}

export interface Kendaraan extends TimestampFields {
  id: string;
  org_id: string;
  nomor_kendaraan: string;
  jenis_kendaraan: string;
  kapasitas: number | null;
  status: GlobalStatus;
}

export interface Supir extends TimestampFields {
  id: string;
  org_id: string;
  nama: string;
  kontak: string | null;
  ktp: string | null;
  alamat: string | null;
  status: GlobalStatus;
}

export interface ModApp extends TimestampFields {
  id: string;
  nama: string;
  deskripsi: string | null;
  status: GlobalStatus;
}

export interface FilterOption {
  label: string;
  value: string;
}

export { Material, CreateMaterialPayload, UpdateMaterialPayload } from './material';
