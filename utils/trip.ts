/**
 * Queue-side rules for an SPB trip. No imports on purpose: the sync processor
 * and the queue screen both use this, and the check scripts load it bare.
 */

export type TripConflictCode = 'SPB_NUMBER_TAKEN' | 'RESTAN_COLLECTED' | 'PANEN_BELUM_SINKRON';
export interface TripConflict { code: TripConflictCode; restan_id?: string; bkm_panen_client_request_id?: string }

/** A stored document is a trip when it has no header TPH; legacy single-TPH rows always do. */
export const isTrip = (doc: { tph_id?: string | null }) => !doc.tph_id;

/** A trip header names an SPB number and no TPH; an old-shape document is the reverse. */
export const isTripHeader = (header: { nomor_spb?: unknown; tph_id?: unknown } | null | undefined) =>
  !!header?.nomor_spb && !header.tph_id;

/** The `409` a Mandor has to resolve, or null for any other failure. */
export function tripConflictOf(error: unknown): TripConflict | null {
  const e = error as { status?: number; data?: unknown; response?: { status?: number; data?: unknown } };
  if ((e?.status ?? e?.response?.status) !== 409) return null;
  const body = (e.data ?? e.response?.data) as { code?: unknown; restan_id?: unknown; bkm_panen_client_request_id?: unknown } | undefined;
  if (body?.code === 'SPB_NUMBER_TAKEN') return { code: body.code };
  if (body?.code === 'PANEN_BELUM_SINKRON') {
    return { code: body.code, ...(typeof body.bkm_panen_client_request_id === 'string' ? { bkm_panen_client_request_id: body.bkm_panen_client_request_id } : {}) };
  }
  if (body?.code === 'RESTAN_COLLECTED') {
    return { code: body.code, ...(typeof body.restan_id === 'string' ? { restan_id: body.restan_id } : {}) };
  }
  return null;
}

export function tripConflictText(conflict: TripConflict, nomorSpb?: unknown): string {
  if (conflict.code === 'PANEN_BELUM_SINKRON') {
    return 'Panen untuk baris ini belum/gagal terkirim. Kirim ulang setelah Panen diperbaiki di antrian, atau buang baris itu dari SPB ini.';
  }
  return conflict.code === 'SPB_NUMBER_TAKEN'
    ? `Nomor SPB ${String(nomorSpb ?? '')} sudah dipakai SPB lain. Ganti nomor SPB, lalu kirim ulang.`
    : 'Restan sudah diambil SPB lain. Buang baris restan itu dari SPB ini, lalu kirim ulang.';
}

/**
 * Thrown by the processor when a trip must wait for a Panen still in this phone's
 * queue. The pass puts the item back with a delay instead of counting a failure.
 */
export const isWaitingForPanen = (error: unknown) => (error as { waiting?: unknown } | null)?.waiting === true;

type Payload = Record<string, unknown>;
type Line = { restan_id?: string | null; bkm_panen_client_request_id?: string | null };

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
 * An unsynced Panen is either resent as it is (`drop_panen` off) or its line is
 * dropped; that line never reached the server, so nothing is deleted there.
 */
export function resolveTripConflict(payload: Payload, fix: { nomor_spb?: string; drop_panen?: boolean } = {}): Payload | null {
  const conflict = payload.conflict as TripConflict | undefined;
  const { conflict: _resolved, ...rest } = payload;
  if (conflict?.code === 'SPB_NUMBER_TAKEN') {
    const nomor = fix.nomor_spb?.trim();
    const header = payload.header as Payload;
    return nomor && nomor !== header.nomor_spb ? { ...rest, header: { ...header, nomor_spb: nomor } } : null;
  }
  if (conflict?.code === 'PANEN_BELUM_SINKRON') {
    if (!fix.drop_panen) return rest;
    const details = ((payload.details as Line[] | undefined) ?? []).filter((line) => line.bkm_panen_client_request_id !== conflict.bkm_panen_client_request_id);
    return details.length ? { ...rest, details } : null;
  }
  if (conflict?.code === 'RESTAN_COLLECTED' && conflict.restan_id) {
    const details = ((payload.details as Line[] | undefined) ?? []).filter((line) => line.restan_id !== conflict.restan_id);
    if (!details.length) return null;
    const dropped = [...((payload.drop_restan_ids as string[] | undefined) ?? []), conflict.restan_id];
    return { ...rest, details, drop_restan_ids: dropped };
  }
  return null;
}

/** The V3 QR starts with `V3|`; any other scanned or typed value is an SPB number. */
export const isV3Qr = (value: string) => value.trim().startsWith('V3|');

/** A `202` body: the server kept the weighing or ticket until its trip is dispatched. */
export const isMenungguSpb = (body: unknown): body is { menunggu_spb: true; nomor_spb: string } =>
  (body as { menunggu_spb?: unknown } | null | undefined)?.menunggu_spb === true;

export type SpbConflictCode = 'SPB_ALREADY_WEIGHED' | 'QR_V3_RETIRED' | 'SPB_TICKET_EXISTS' | 'TICKET_NUMBER_TAKEN';
export interface SpbConflict { code: SpbConflictCode }
const SPB_CONFLICT_CODES: readonly unknown[] = ['SPB_ALREADY_WEIGHED', 'QR_V3_RETIRED', 'SPB_TICKET_EXISTS', 'TICKET_NUMBER_TAKEN'];

/**
 * The `409` (or `410`) a Krani has to resolve when weighing or filing a ticket
 * by SPB number, or null for any other failure. A plain 409 such as a replayed
 * QR (`DUPLICATE_TRANSACTION`) is not one of these.
 */
export function spbConflictOf(error: unknown): SpbConflict | null {
  const e = error as { status?: number; data?: unknown; response?: { status?: number; data?: unknown } };
  const status = e?.status ?? e?.response?.status;
  if (status !== 409 && status !== 410) return null;
  const code = ((e.data ?? e.response?.data) as { code?: unknown } | undefined)?.code;
  return SPB_CONFLICT_CODES.includes(code) ? { code: code as SpbConflictCode } : null;
}

export function spbConflictText(conflict: SpbConflict, nomorSpb?: unknown): string {
  const spb = nomorSpb ? ` ${String(nomorSpb)}` : '';
  switch (conflict.code) {
    case 'SPB_ALREADY_WEIGHED':
      return `SPB${spb} sudah ditimbang. Periksa nomor SPB, atau buang timbangan ini dari menu Akun.`;
    case 'QR_V3_RETIRED':
      return 'QR SPB lama (V3) sudah tidak diterima. Timbang dengan nomor SPB: ketik nomor dari SPB kertas.';
    case 'SPB_TICKET_EXISTS':
      return `SPB${spb} sudah memiliki tiket PKS. Periksa nomor SPB, atau buang tiket ini dari menu Akun.`;
    default:
      return 'Nomor tiket sudah dipakai tiket lain. Periksa nomor pada tiket PKS, lalu kirim ulang.';
  }
}

/**
 * The payload to retry after the Krani corrects a weighing or ticket conflict,
 * or null when the fix changes nothing. A ticket number clash needs a new
 * `nomor_tiket`; the other conflicts need the SPB number, which for a V3 QR
 * weighing replaces the QR (`qr_payload`) altogether.
 */
export function resolveSpbConflict(payload: Payload, fix: { nomor_spb?: string; nomor_tiket?: string } = {}): Payload | null {
  const conflict = payload.conflict as SpbConflict | undefined;
  const { conflict: _resolved, ...rest } = payload;
  if (conflict?.code === 'TICKET_NUMBER_TAKEN') {
    const nomor = fix.nomor_tiket?.trim();
    return nomor && nomor !== payload.nomor_tiket ? { ...rest, nomor_tiket: nomor } : null;
  }
  if (!conflict) return null;
  const nomor = fix.nomor_spb?.trim();
  if (!nomor || nomor === payload.nomor_spb) return null;
  const { qr_payload: _qr, ...bySpb } = rest;
  return { ...bySpb, nomor_spb: nomor };
}

export interface WaitingSpbRow {
  id: string;
  nomor_spb: string;
  kind: 'TIKET' | 'TIMBANGAN';
  /** The worker refused the match; `message` says why and a retry may fix it. */
  failed: boolean;
  message: string | null;
  created_at: string;
}

type StagingLog = {
  id: string; unique_transaction_id: string; nomor_spb: string | null; status: string;
  error_message: string | null; created_at: string;
};

/** The staged logs that wait on an SPB number. A staged ticket is keyed `PKS|<nomor_spb>`; a weighing by the number itself. */
export function waitingSpbRows(logs: StagingLog[]): WaitingSpbRow[] {
  return logs
    .filter((log) => !!log.nomor_spb && (log.status === 'PENDING' || log.status === 'FAILED'))
    .map((log) => ({
      id: log.id,
      nomor_spb: log.nomor_spb as string,
      kind: log.unique_transaction_id.startsWith('PKS|') ? 'TIKET' as const : 'TIMBANGAN' as const,
      failed: log.status === 'FAILED',
      message: log.error_message,
      created_at: log.created_at,
    }));
}
