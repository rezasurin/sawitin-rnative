import type { TiketPksFields, TiketPks } from '@/types/tiket-pks';

export function ticketWeightsValid(value: Pick<TiketPksFields, 'bruto_pabrik' | 'tara_pabrik' | 'netto_pabrik'>) {
  const { bruto_pabrik: gross, tara_pabrik: tare, netto_pabrik: net } = value;
  if (!Number.isFinite(net) || net <= 0) return false;
  if (gross != null && (!Number.isFinite(gross) || gross < 0)) return false;
  if (tare != null && (!Number.isFinite(tare) || tare < 0)) return false;
  return gross == null || tare == null || Math.abs(gross - tare - net) <= 1;
}

/** A lost response can be accepted only when the server has this same ticket. */
export function sameFiledTicket(server: TiketPks | null, draft: TiketPksFields & { krani_timbang_id?: string }) {
  // A ticket filed by SPB number has no weighing id to compare, only its own fields.
  return !!server && (!draft.krani_timbang_id || server.krani_timbang_id === draft.krani_timbang_id) &&
    server.nomor_tiket === draft.nomor_tiket &&
    new Date(server.tanggal_tiket).getTime() === new Date(draft.tanggal_tiket).getTime() &&
    Number(server.netto_pabrik) === draft.netto_pabrik &&
    (server.bruto_pabrik == null ? null : Number(server.bruto_pabrik)) === (draft.bruto_pabrik ?? null) &&
    (server.tara_pabrik == null ? null : Number(server.tara_pabrik)) === (draft.tara_pabrik ?? null) &&
    (server.foto_url ?? null) === (draft.foto_url ?? null);
}

const WIB_MS = 7 * 60 * 60 * 1000;

/** `YYYY-MM-DD HH:mm` on the estate (WIB) clock, whatever the device timezone. */
export const estateStamp = (date = new Date()) => new Date(date.getTime() + WIB_MS).toISOString().slice(0, 16).replace('T', ' ');

/** The instant a WIB `YYYY-MM-DD HH:mm` stamp names, or null when it is not one. */
export function parseEstateStamp(stamp: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(stamp.trim());
  const date = match ? new Date(`${match[1]}T${match[2]}:00+07:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
