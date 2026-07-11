import { GlobalStatus, TimestampFields } from './common';

export interface HargaTbs extends TimestampFields {
  id: string;
  org_id: string;
  tanggal: string;
  harga: number;
  keterangan: string | null;
  status: GlobalStatus;
}

export interface CreateHargaTbsPayload {
  tanggal: string;
  harga: number;
  keterangan?: string;
  status?: GlobalStatus;
}

export type UpdateHargaTbsPayload = Partial<CreateHargaTbsPayload>;
