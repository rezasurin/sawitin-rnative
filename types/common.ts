export type GlobalStatus = 'ACTIVE' | 'INACTIVE';
export type DocumentStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'CANCELLED';
export type TipePengiriman = 'LANGSUNG' | 'TITIP' | 'RESTAN';
export type OriginSource = 'MANUAL' | 'QR_SCAN';
export type PendingStatus = 'PENDING' | 'MATCHED' | 'FAILED';
export type TransactionType = 'IN' | 'OUT';
export type LogActionType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TimestampFields {
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string | null;
}
