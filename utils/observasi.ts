export const SENSUS_BJR_UNIT = 'kg';

/** Parses a whole, positive count typed into a text field; undefined when it is not one. */
export function parseSampleCount(text: string): number | undefined {
  const count = Number(text.trim());
  return text.trim() !== '' && Number.isInteger(count) && count > 0 ? count : undefined;
}

/**
 * A BJR census is a counted sample weighed for one block: bunches weighed and
 * their total kg. Mirrors the server rule so it never dead-letters in the queue.
 */
export function sensusBjrError(input: { blockId: string; sampleCount: string; totalKg: string }): string | null {
  if (!input.blockId) return 'Pilih blok yang disensus.';
  if (parseSampleCount(input.sampleCount) === undefined) return 'Jumlah sampel harus bilangan bulat lebih dari 0.';
  const total = Number(input.totalKg.trim());
  if (input.totalKg.trim() === '' || !Number.isFinite(total) || total <= 0) return 'Total berat sampel (kg) harus lebih dari 0.';
  return null;
}

/** Mean bunch weight of the sample, one decimal. */
export function sampleBjr(totalKg: number, sampleCount: number): number {
  return Math.round((totalKg / sampleCount) * 10) / 10;
}
