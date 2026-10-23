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
