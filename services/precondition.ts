import type { AxiosRequestConfig } from 'axios';

/**
 * The optimistic-concurrency header the backend reads on Panen, Checker and
 * Rawat updates: the `modified_at` this edit was based on.
 *
 * Omitting it keeps the old last-write-wins behaviour, which is why every
 * caller can adopt it independently. A queued edit *should* always send it —
 * without it, an item written on Tuesday and synced on Thursday silently
 * overwrites Wednesday's correction.
 */
export const withPrecondition = (
  modifiedAt?: string | null,
  config: AxiosRequestConfig = {}
): AxiosRequestConfig =>
  modifiedAt
    ? { ...config, headers: { ...config.headers, 'If-Unmodified-Since': modifiedAt } }
    : config;
