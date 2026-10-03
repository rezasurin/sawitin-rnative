import { isAxiosError } from 'axios';
import type { SyncErrorClass } from '@/types/sync';

/** Never grows beyond an hour: a device that comes back should catch up today. */
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

export interface Classified {
  errorClass: SyncErrorClass;
  /** True when trying again can never help, so the item waits for a person. */
  dead: boolean;
  message: string;
}

const statusOf = (error: unknown): number | undefined => {
  if (isAxiosError(error)) return error.response?.status;
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

const messageOf = (error: unknown) =>
  (isAxiosError(error) && (error.response?.data?.error ?? error.message)) ||
  (error instanceof Error ? error.message : String(error));

/**
 * Every failure used to be the same failure: increment a counter and try again.
 * That burned five attempts on a payload the server will never accept, and
 * threw away work when a token had merely expired.
 *
 * The distinction that matters is whether trying again could ever succeed.
 * Retrying a validation error or a conflict cannot, so those stop immediately
 * and wait for a person rather than exhausting their retries and vanishing.
 */
export function classify(error: unknown, retryCount: number, maxRetries: number): Classified {
  const status = statusOf(error);
  const message = String(messageOf(error));

  // No response at all: offline, DNS, timeout. The commonest case in a block.
  if (status === undefined) {
    return { errorClass: 'RETRYABLE', dead: retryCount + 1 >= maxRetries, message };
  }
  if (status === 401 || status === 403) {
    // The token, not the payload. The work is kept and the queue pauses; a
    // sign-in is what fixes this, and burning retries would only lose it.
    return { errorClass: 'AUTH', dead: false, message };
  }
  if (status === 409) {
    return { errorClass: 'CONFLICT', dead: true, message };
  }
  if (status >= 400 && status < 500) {
    // 404 included: the document this item edits is gone.
    return { errorClass: 'VALIDATION', dead: true, message };
  }
  return { errorClass: 'RETRYABLE', dead: retryCount + 1 >= maxRetries, message };
}

/** Exponential, so a flapping connection is not hammered. */
export function backoffUntil(retryCount: number, now = Date.now()) {
  return now + Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
}

/** An auth failure stops the whole pass: every other item would fail the same way. */
export const isBlocking = (errorClass: SyncErrorClass) => errorClass === 'AUTH';
