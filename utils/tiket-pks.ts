import type { CreateTiketPksPayload, TiketPks } from '@/types/tiket-pks';

export function ticketWeightsValid(value: Pick<CreateTiketPksPayload, 'bruto_pabrik' | 'tara_pabrik' | 'netto_pabrik'>) {
  const { bruto_pabrik: gross, tara_pabrik: tare, netto_pabrik: net } = value;
  if (!Number.isFinite(net) || net <= 0) return false;
  if (gross != null && (!Number.isFinite(gross) || gross < 0)) return false;
  if (tare != null && (!Number.isFinite(tare) || tare < 0)) return false;
  return gross == null || tare == null || Math.abs(gross - tare - net) <= 1;
}

/** A lost response can be accepted only when the server has this same ticket. */
export function sameFiledTicket(server: TiketPks | null, draft: CreateTiketPksPayload) {
  return !!server && server.krani_timbang_id === draft.krani_timbang_id &&
    server.nomor_tiket === draft.nomor_tiket &&
    new Date(server.tanggal_tiket).getTime() === new Date(draft.tanggal_tiket).getTime() &&
    Number(server.netto_pabrik) === draft.netto_pabrik &&
    (server.bruto_pabrik == null ? null : Number(server.bruto_pabrik)) === (draft.bruto_pabrik ?? null) &&
    (server.tara_pabrik == null ? null : Number(server.tara_pabrik)) === (draft.tara_pabrik ?? null) &&
    (server.foto_url ?? null) === (draft.foto_url ?? null);
}
