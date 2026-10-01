/**
 * Queue-side rules for an SPB trip. No imports on purpose: the sync processor
 * and the queue screen both use this, and the check scripts load it bare.
 */

export type TripConflictCode = 'SPB_NUMBER_TAKEN' | 'RESTAN_COLLECTED';
export interface TripConflict { code: TripConflictCode; restan_id?: string }

/** A stored document is a trip when it has no header TPH; legacy single-TPH rows always do. */
export const isTrip = (doc: { tph_id?: string | null }) => !doc.tph_id;

/** A trip header names an SPB number and no TPH; an old-shape document is the reverse. */
export const isTripHeader = (header: { nomor_spb?: unknown; tph_id?: unknown } | null | undefined) =>
  !!header?.nomor_spb && !header.tph_id;

/** The `409` a Mandor has to resolve, or null for any other failure. */
export function tripConflictOf(error: unknown): TripConflict | null {
  const e = error as { status?: number; data?: unknown; response?: { status?: number; data?: unknown } };
  if ((e?.status ?? e?.response?.status) !== 409) return null;
  const body = (e.data ?? e.response?.data) as { code?: unknown; restan_id?: unknown } | undefined;
  if (body?.code === 'SPB_NUMBER_TAKEN') return { code: body.code };
  if (body?.code === 'RESTAN_COLLECTED') {
    return { code: body.code, ...(typeof body.restan_id === 'string' ? { restan_id: body.restan_id } : {}) };
  }
  return null;
}

export function tripConflictText(conflict: TripConflict, nomorSpb?: unknown): string {
  return conflict.code === 'SPB_NUMBER_TAKEN'
    ? `Nomor SPB ${String(nomorSpb ?? '')} sudah dipakai SPB lain. Ganti nomor SPB, lalu kirim ulang.`
    : 'Restan sudah diambil SPB lain. Buang baris restan itu dari SPB ini, lalu kirim ulang.';
}

type Payload = Record<string, unknown>;
type Line = { restan_id?: string | null };

/** Restan that queued trips that have not synced yet already claim. */
export function claimedRestanIds(queue: { module: string; action: string; payload: Payload | null }[]): Set<string> {
  const claimed = new Set<string>();
  for (const item of queue) {
    if (item.module !== 'bkm_checker' || item.action !== 'CREATE') continue;
    for (const line of (item.payload?.details as Line[] | undefined) ?? []) if (line.restan_id) claimed.add(line.restan_id);
  }
  return claimed;
}

/**
 * The payload to retry after the Mandor resolves a trip conflict, or null when
 * nothing is left to send. A replaced SPB number goes back in the header. A
 * collected restan's line is dropped here and, through `drop_restan_ids`, also
 * from the server draft, where the lines posted before the conflict still sit.
 */
export function resolveTripConflict(payload: Payload, fix: { nomor_spb?: string } = {}): Payload | null {
  const conflict = payload.conflict as TripConflict | undefined;
  const { conflict: _resolved, ...rest } = payload;
  if (conflict?.code === 'SPB_NUMBER_TAKEN') {
    const nomor = fix.nomor_spb?.trim();
    const header = payload.header as Payload;
    return nomor && nomor !== header.nomor_spb ? { ...rest, header: { ...header, nomor_spb: nomor } } : null;
  }
  if (conflict?.code === 'RESTAN_COLLECTED' && conflict.restan_id) {
    const details = ((payload.details as Line[] | undefined) ?? []).filter((line) => line.restan_id !== conflict.restan_id);
    if (!details.length) return null;
    const dropped = [...((payload.drop_restan_ids as string[] | undefined) ?? []), conflict.restan_id];
    return { ...rest, details, drop_restan_ids: dropped };
  }
  return null;
}
