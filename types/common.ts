export type GlobalStatus = 'ACTIVE' | 'INACTIVE';
export type DocumentStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'CANCELLED';
/** Trip line source: LANGSUNG = today's Panen, TITIP = restan collected from an earlier day, RESTAN = legacy. */
export type TipePengiriman = 'LANGSUNG' | 'TITIP' | 'RESTAN';
/** PKS = weighing created from a mill ticket; its internal netto is null. */
export type OriginSource = 'MANUAL' | 'BKM_CHECKER' | 'STAGING' | 'RESTAN' | 'PKS';
export type PendingStatus = 'PENDING' | 'MATCHED' | 'FAILED';
export type TransactionType = 'IN' | 'OUT';
export type LogActionType = 'CREATE' | 'UPDATE' | 'DELETE';

/** A list as the backend's `applyQueryFilters` sends it. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    /** Null when the request skipped the count (`totals=false`). */
    total: number | null;
    pages: number | null;
    /** True when a further page exists, whether or not the count was taken. */
    has_more?: boolean;
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
