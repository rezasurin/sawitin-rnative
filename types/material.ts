import { GlobalStatus, DocumentStatus, TransactionType, TimestampFields } from './common';

export interface Material extends TimestampFields {
  id: string;
  org_id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  harga_satuan: number | null;
  stok: number | null;
  status: GlobalStatus;
}

export interface CreateMaterialPayload {
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  harga_satuan?: number;
  stok?: number;
  status?: GlobalStatus;
}

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

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
