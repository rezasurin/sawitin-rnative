import { GlobalStatus, DocumentStatus, TransactionType, TimestampFields } from './common';

export interface KategoriMaterial {
  id: string;
  nama: string;
  /** Materials in this category may be issued as vehicle fuel. */
  is_bbm: boolean;
  status?: GlobalStatus;
}

export interface Material extends TimestampFields {
  id: string;
  org_id: string;
  kode: string;
  nama: string;
  kategori_material_id: string;
  kategori_material?: KategoriMaterial;
  satuan: string;
  harga_satuan: number | null;
  stok: number | null;
  bahan_aktif: string | null;
  konsentrasi: string | null;
  status: GlobalStatus;
}

export interface CreateMaterialPayload {
  kode: string;
  nama: string;
  kategori_material_id: string;
  satuan: string;
  harga_satuan?: number;
  stok?: number;
  bahan_aktif?: string | null;
  konsentrasi?: string | null;
  status?: GlobalStatus;
}

export type UpdateMaterialPayload = Partial<Omit<CreateMaterialPayload, 'stok'>>;

export interface MaterialTransaction {
  id: string;
  org_id: string;
  material_id: string;
  quantity: number;
  type: TransactionType;
  reference_id: string | null;
  keterangan: string | null;
  status: DocumentStatus;
  created_at: string;
  created_by: string;
  material?: Material;
}
