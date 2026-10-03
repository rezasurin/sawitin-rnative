import type { CreateBkmCheckerDetailPayload } from '@/types/bkm-checker';

type Load = Pick<CreateBkmCheckerDetailPayload,
  'tipe_pengiriman' | 'kendaraan_id' | 'nomor_truk' | 'nama_sopir' | 'tujuan_kirim'>;

const normalized = (value?: string | null) => (value ?? '').trim().toLocaleUpperCase('id-ID');

/** A QR weighing checks text snapshots as well as the master vehicle identity. */
export function checkerLoadConflict(rows: Load[]): string | null {
  const linked = rows.filter((row) => !!row.kendaraan_id);
  if (linked.some((row) => row.kendaraan_id !== linked[0]?.kendaraan_id))
    return 'Satu Checker hanya boleh memuat satu kendaraan. Buat dokumen baru untuk truk lain.';
  const loaded = rows.filter((row) => row.tipe_pengiriman !== 'RESTAN');
  const first = loaded[0];
  if (!first) return null;
  for (const row of loaded.slice(1)) {
    if (normalized(first.nomor_truk) !== normalized(row.nomor_truk))
      return 'Nomor truk berbeda. Buat dokumen Checker baru untuk truk lain.';
    if (normalized(first.nama_sopir) !== normalized(row.nama_sopir) ||
        normalized(first.tujuan_kirim) !== normalized(row.tujuan_kirim))
      return 'Sopir dan tujuan pada semua muatan harus sama agar SPB dapat ditimbang.';
  }
  return null;
}
