/**
 * Rules for the daily close (tutup harian). No runtime imports on purpose: the
 * screens and `scripts/check-close-policy.cjs` both load this bare.
 */
import type { CloseException, CloseTph, SubmitClosePayload, TutupHarianPreview } from '@/types/tutup-harian';

export const CLOSE_OFFLINE_TEXT = 'Tutup harian butuh koneksi';
export const DAY_CLOSED_TEXT = 'Hari sudah ditutup — minta Asisten membuka kembali';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Diajukan', APPROVED: 'Disetujui', REVISION_REQUESTED: 'Ditolak',
};
/** A farm-day with no close yet reads as Draft, like a reopened one. */
export const closeStatusLabel = (status?: string | null) => STATUS_LABEL[status ?? 'DRAFT'] ?? 'Draft';

/** What the Mandor typed per TPH, as text so a half-typed number is not lost. */
export type Counts = Record<string, { janjang: string; brondol: string }>;
export type Notes = Record<string, string>;

/** The submitted count if there is one, else the computed remainder. */
export function initialCounts(tph: CloseTph[]): Counts {
  return Object.fromEntries(tph.map((row) => [row.tph_id, {
    janjang: String(row.restan_hitung_janjang ?? row.restan_usulan_janjang),
    brondol: String(row.restan_hitung_brondol_kg ?? row.restan_usulan_brondol_kg),
  }]));
}

const whole = (value: string) => /^\d+$/.test(value.trim()) ? Number(value) : null;

/** The count as the server wants it, or null while any figure is not a whole number. */
export function countRows(counts: Counts, tph: CloseTph[]): SubmitClosePayload['restan'] | null {
  const rows: SubmitClosePayload['restan'] = [];
  for (const row of tph) {
    const entered = counts[row.tph_id] ?? { janjang: '0', brondol: '0' };
    const jumlah_janjang = whole(entered.janjang);
    const jumlah_brondol = whole(entered.brondol);
    if (jumlah_janjang === null || jumlah_brondol === null) return null;
    rows.push({ tph_id: row.tph_id, jumlah_janjang, jumlah_brondol });
  }
  return rows;
}

/**
 * Every exception that needs a note. The preview only knows the count once it
 * is submitted, so a changed count adds `RESTAN_DIFFERENCE` and `TPH_BALANCE`
 * here the same way the server will, and `extra` carries keys a `NOTE_REQUIRED`
 * answer named that this pre-check missed.
 */
export function noteItems(preview: TutupHarianPreview, counts: Counts, tolerancePct: number, extra: string[] = []) {
  const items = new Map<string, { key: string; message: string; catatan: string | null }>();
  const add = (key: string, message: string, catatan: string | null = null) => { if (!items.has(key)) items.set(key, { key, message, catatan }); };
  for (const item of preview.exceptions) if (item.severity === 'NOTE' && item.code !== 'RESTAN_DIFFERENCE' && item.code !== 'TPH_BALANCE') add(item.key, item.message, item.catatan);
  const filed = new Map(preview.exceptions.map((item) => [item.key, item]));
  for (const row of preview.tph) {
    const janjang = whole(counts[row.tph_id]?.janjang ?? '');
    if (janjang === null) continue;
    const nama = row.nama;
    if (janjang !== row.restan_usulan_janjang) {
      const key = `RESTAN_DIFFERENCE:${row.tph_id}`;
      add(key, `${nama}: restan dihitung ${janjang} janjang, hitungan sistem ${row.restan_usulan_janjang}`, filed.get(key)?.catatan);
    }
    const selisih = row.panen_janjang - row.langsung_janjang - janjang;
    if (Math.abs(selisih) * 100 > row.panen_janjang * tolerancePct) {
      const key = `TPH_BALANCE:${row.tph_id}`;
      add(key, `${nama}: panen ${row.panen_janjang} tidak sama dengan dimuat ${row.langsung_janjang} ditambah restan ${janjang}`, filed.get(key)?.catatan);
    }
  }
  for (const key of extra) add(key, `Pengecualian ${key.split(':')[0]}`, filed.get(key)?.catatan);
  return [...items.values()];
}

/** A note typed now wins over the one already filed. */
export const noteOf = (item: { key: string; catatan: string | null }, notes: Notes) => (notes[item.key] ?? item.catatan ?? '').trim();

export const blockingOf = (preview: TutupHarianPreview): CloseException[] => preview.exceptions.filter((item) => item.severity === 'BLOCKING');

/** Why the Mandor cannot submit yet, or null when the form may send. */
export function submitBlock(input: {
  online: boolean; preview?: TutupHarianPreview; counts: Counts; notes: Notes; tolerancePct: number; extraKeys?: string[]; canWrite?: boolean;
}): string | null {
  const { online, preview, counts, notes, tolerancePct } = input;
  if (!online) return CLOSE_OFFLINE_TEXT;
  if (!preview) return 'Pratinjau belum dimuat';
  if (input.canWrite === false) return 'Anda tidak punya izin mengajukan tutup harian';
  const status = preview.tutup_harian?.status;
  if (status === 'SUBMITTED') return 'Tutup harian ini sudah diajukan dan menunggu Asisten';
  if (status === 'APPROVED') return 'Tutup harian ini sudah disetujui. Minta Asisten membuka kembali';
  if (blockingOf(preview).length || !preview.ringkasan.bisa_diajukan) {
    return `${blockingOf(preview).map((item) => item.message).join('; ') || 'Masih ada dokumen DRAFT atau minta revisi'}. Selesaikan dokumen itu dulu`;
  }
  if (!countRows(counts, preview.tph)) return 'Restan harus berupa bilangan bulat';
  const missing = noteItems(preview, counts, tolerancePct, input.extraKeys).filter((item) => !noteOf(item, notes));
  if (missing.length) return `Isi catatan untuk ${missing.length} pengecualian`;
  return null;
}

/** The body for `POST /tutupHarian`: a note per needs-a-note exception, by key. */
export function submitPayload(preview: TutupHarianPreview, counts: Counts, notes: Notes, tolerancePct: number, catatan: string, extraKeys: string[] = []): SubmitClosePayload | null {
  const restan = countRows(counts, preview.tph);
  if (!restan) return null;
  return {
    kelompok_lahan_id: preview.kelompok_lahan_id,
    tanggal: preview.tanggal,
    restan,
    ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
    catatan_pengecualian: Object.fromEntries(noteItems(preview, counts, tolerancePct, extraKeys).map((item) => [item.key, noteOf(item, notes)])),
  };
}

/** Why the Asisten cannot decide this close right now, or null. */
export function approvalBlock(input: { online: boolean; preview?: TutupHarianPreview; userCode?: string | null; canApprove: boolean }): string | null {
  const { online, preview, userCode, canApprove } = input;
  if (!online) return CLOSE_OFFLINE_TEXT;
  if (preview?.tutup_harian?.status !== 'SUBMITTED') return 'Tutup harian ini tidak sedang menunggu persetujuan';
  if (!canApprove) return 'Anda tidak punya izin menyetujui tutup harian';
  if (blockingOf(preview).length) return 'Masih ada dokumen DRAFT atau minta revisi';
  return null;
}
/** Self-approval: the server refuses it, so the Asisten screen hides approve for the submitter. */
export const isOwnClose = (preview: { tutup_harian: { submitted_by: string | null } | null } | undefined, userCode?: string | null) =>
  !!userCode && preview?.tutup_harian?.submitted_by === userCode;

export interface CloseFailure { text: string; refetch: boolean; missing?: string[] }

/** One plain sentence per contract answer; a 409 means "the server moved on, reload". */
export function closeFailure(error: unknown): CloseFailure {
  const e = error as { status?: number; message?: string; data?: { code?: string; missing?: string[]; exceptions?: { message?: string }[] } };
  const code = e?.data?.code;
  const refetch = e?.status === 409;
  switch (code) {
    case 'NOTE_REQUIRED': return { text: 'Ada pengecualian yang belum diberi catatan.', refetch, missing: e.data?.missing ?? [] };
    case 'CLOSE_BLOCKED': return { text: `Masih ada dokumen yang belum selesai${e.data?.exceptions?.length ? `: ${e.data.exceptions.map((x) => x.message).join('; ')}` : ''}. Data terbaru dimuat.`, refetch };
    case 'CLOSE_ALREADY_SUBMITTED': return { text: 'Tutup harian ini sudah diajukan. Data terbaru dimuat.', refetch };
    case 'CLOSE_ALREADY_APPROVED': return { text: 'Tutup harian ini sudah disetujui. Minta Asisten membuka kembali bila perlu mengubahnya.', refetch };
    case 'RESTAN_COLLECTED': return { text: 'Restan dari tutup harian ini sudah diambil truk, jadi tidak dapat diubah atau ditolak.', refetch };
    case 'CLOSE_NOT_SUBMITTED': return { text: 'Tutup harian ini sudah diproses orang lain (disetujui, ditolak, atau dibuka kembali). Data terbaru dimuat.', refetch };
    case 'CLOSE_CHANGED': return { text: 'Ada dokumen yang berubah saat disetujui. Data terbaru dimuat; periksa lalu coba lagi.', refetch };
    case 'SELF_APPROVAL': return { text: 'Anda tidak dapat menyetujui tutup harian yang Anda ajukan sendiri.', refetch };
    case 'APPROVE_PERMISSION_REQUIRED': return { text: 'Menyetujui butuh izin setujui pada BKM Panen dan BKM Checker.', refetch };
    case 'CLOSE_DATE_FUTURE': return { text: 'Hari ini belum dimulai, jadi belum bisa ditutup.', refetch };
    case 'RESTAN_TPH_INVALID': return { text: 'Ada TPH yang bukan bagian dari kelompok lahan ini.', refetch };
    default:
      return { text: e?.status === 403 ? 'Izin tindakan ini tidak tersedia.' : e?.message || 'Terjadi kesalahan.', refetch };
  }
}

const UTC_OFFSET_HOURS: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };

/**
 * The pending list carries no `terlambat`, so the Asisten's list works it out:
 * the deadline is `jam`:00 local on the day after `tanggal`. The detail shows
 * the server's own flag. ponytail: Indonesian zones only; others read as WIB.
 */
export function pastDeadline(tanggal: string, jam: number, timezone: string, now = Date.now()) {
  const offset = UTC_OFFSET_HOURS[timezone] ?? 7;
  return now > Date.parse(`${tanggal}T00:00:00Z`) + (24 + jam - offset) * 3600 * 1000;
}
