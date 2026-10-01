import { estateDate } from '@/utils/estateDate';
import { claimedRestanIds } from '@/utils/trip';
import type { TripHeaderDraft, TripLineDraft } from '@/types/bkm-checker';
import type { Restan } from '@/types/restan';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the truck left. Today it is now; a trip entered for an earlier estate day
 * is stamped midday WIB, because the server only reads the day from it and the
 * hour of a backdated trip is not known.
 */
export function dispatchedAtFor(day: string, now = new Date()): string {
  return day === estateDate(now) ? now.toISOString() : new Date(`${day}T12:00:00+07:00`).toISOString();
}

/** Whole estate days between the harvest day and `today`; 0 on the harvest day itself. */
export function restanAgeDays(tanggal: string, today = estateDate()): number {
  return Math.round((Date.parse(today) - Date.parse(estateDate(new Date(tanggal)))) / DAY_MS);
}

/**
 * Open restan a new line may still pick: not collected, not already claimed by a
 * trip waiting in the queue, not already on this draft. Oldest first, because the
 * oldest fruit is the one to move.
 */
export function visibleRestan(
  rows: Restan[] | null | undefined,
  queue: { module: string; action: string; payload: Record<string, unknown> | null }[],
  draftLines: { restan_id?: string }[] = [],
): Restan[] {
  const taken = claimedRestanIds(queue);
  for (const line of draftLines) if (line.restan_id) taken.add(line.restan_id);
  return (rows ?? [])
    .filter((row) => !row.sudah_dikirim && !taken.has(row.id))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

/** Everything the server would refuse at submit that the phone can already see. */
export function tripProblems(header: TripHeaderDraft, lines: TripLineDraft[]): string[] {
  const problems: string[] = [];
  if (!header.nomor_spb.trim()) problems.push('Nomor SPB wajib diisi.');
  if (!header.nomor_truk.trim()) problems.push('Nomor truk wajib diisi.');
  if (!header.nama_sopir.trim()) problems.push('Nama sopir wajib diisi.');
  if (!lines.length) problems.push('Tambahkan minimal satu muatan TPH.');
  for (const line of lines) {
    const name = `${line.tph_nama} (${line.tipe_pengiriman})`;
    if (line.jumlah_janjang < 1) problems.push(`${name}: janjang harus lebih dari 0.`);
    if (line.tipe_pengiriman === 'TITIP' && line.jumlah_janjang > (line.restan_max ?? 0)) {
      problems.push(`${name}: melebihi sisa restan (${line.restan_max ?? 0} janjang).`);
    }
    if (line.tipe_pengiriman === 'LANGSUNG' && line.panen_day !== header.tanggal) {
      problems.push(`${name}: BKM Panen bertanggal ${line.panen_day}, bukan hari berangkat (${header.tanggal}).`);
    }
  }
  return problems;
}

const text = (value: string) => value.trim() || undefined;

/**
 * The queue payload for one trip. Header, lines and the submit flag travel as one
 * item, so the order create, lines, submit holds however long the phone is offline.
 */
export function buildTripPayload(header: TripHeaderDraft, lines: TripLineDraft[], submit: boolean, now = new Date()) {
  const dispatched_at = dispatchedAtFor(header.tanggal, now);
  return {
    header: {
      nomor_spb: header.nomor_spb.trim(),
      tanggal_laporan: dispatched_at,
      dispatched_at,
      kendaraan_id: header.kendaraan_id || undefined,
      supir_id: header.supir_id || undefined,
      nomor_truk: text(header.nomor_truk),
      nama_sopir: text(header.nama_sopir),
      tujuan_kirim: text(header.tujuan_kirim),
      keterangan: text(header.keterangan),
    },
    details: lines.map((line) => ({
      client_detail_id: line.client_detail_id,
      tipe_pengiriman: line.tipe_pengiriman,
      tph_id: line.tph_id,
      ...(line.tipe_pengiriman === 'LANGSUNG' ? { bkm_panen_id: line.bkm_panen_id } : { restan_id: line.restan_id }),
      janjang_normal: line.janjang_normal,
      buah_mentah: line.buah_mentah,
      over_ripe: line.over_ripe,
      tangkai_panjang: line.tangkai_panjang,
      buah_abnormal: line.buah_abnormal,
      janjang_kosong: line.janjang_kosong,
      jumlah_janjang: line.jumlah_janjang,
      jumlah_brondol: line.jumlah_brondol,
    })),
    submit,
  };
}
