import type { DocumentStatus, TimestampFields } from './common';

export interface StockOpnameDetail extends TimestampFields {
  id: string; stock_opname_id: string; material_id: string;
  stok_sistem: number; stok_fisik: number; catatan: string | null;
  material?: { id: string; nama: string; satuan: string };
}
export interface StockOpname extends TimestampFields {
  id: string; org_id: string; tanggal: string; catatan: string | null;
  status: DocumentStatus; details: StockOpnameDetail[]; rejection_note: string | null;
}
