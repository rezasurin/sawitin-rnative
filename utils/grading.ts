import type { JenisPekerjaanPanen } from '@/types/bkm-panen';

/** The six grades a bunch count splits into, in the order every form shows them. */
export const GRADING_FIELDS = [
  { key: 'janjang_normal', label: 'Normal' },
  { key: 'buah_mentah', label: 'Buah Mentah' },
  { key: 'over_ripe', label: 'Over Ripe' },
  { key: 'tangkai_panjang', label: 'Tangkai Panjang' },
  { key: 'buah_abnormal', label: 'Buah Abnormal' },
  { key: 'janjang_kosong', label: 'Janjang Kosong' },
] as const;

export type GradeKey = typeof GRADING_FIELDS[number]['key'];

/** Janjang total as the sum of its grades, so a line always adds up to what was graded. Missing grades count 0. */
export const gradingTotal = (row: Partial<Record<GradeKey, unknown>>): number =>
  GRADING_FIELDS.reduce((sum, field) => sum + (Number(row[field.key]) || 0), 0);

/** A worker's role on a BKM Panen line, in the order the picker shows them. Labels match the web. */
export const JENIS_PEKERJAAN_PANEN: readonly { value: JenisPekerjaanPanen; label: string }[] = [
  { value: 'PANEN', label: 'Pemanen' },
  { value: 'PEMBRONDOL', label: 'Pembrondol' },
  { value: 'PEMUAT', label: 'Pemuat' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export const jenisPekerjaanLabel = (jenis: string): string =>
  JENIS_PEKERJAAN_PANEN.find((j) => j.value === jenis)?.label ?? jenis;

/** Only a pemanen grades bunches; the server answers 400 for janjang on any other role. */
export const recordsJanjang = (jenis: string): boolean => jenis === 'PANEN';

/** A pemanen or a pembrondol may weigh brondolan; the server answers 400 on any other role. */
export const recordsBrondol = (jenis: string): boolean => jenis === 'PANEN' || jenis === 'PEMBRONDOL';

/**
 * TPHs where a pemanen and a pembrondol both weighed brondolan, which may be the
 * same fruit counted twice. A hint only: some estates do split it between them.
 */
export const tphsWithSplitBrondol = (
  lines: readonly { tph_id: string; jenis_pekerjaan: string; jumlah_brondol?: number | null }[],
): string[] => {
  const weighed = (jenis: string) =>
    new Set(lines.filter((l) => l.jenis_pekerjaan === jenis && (l.jumlah_brondol ?? 0) > 0).map((l) => l.tph_id));
  const pembrondol = weighed('PEMBRONDOL');
  return [...weighed('PANEN')].filter((tph) => pembrondol.has(tph));
};
