// Mirrors the backend rule (sawitin-backend/src/utils/maturity.ts) so a Panen is
// judged offline the way the server will judge it when the queue drains.
// ponytail: thresholds duplicated from the backend constants; keep them in step.
const IMMATURE_YEARS = 4;
const OLD_STAND_YEARS = 25;

export type Maturitas = 'TBM' | 'TM' | 'TUA';

export interface Stand {
  tahun_tanam?: number | null;
  /** YYYY-MM-DD, or the ISO timestamp the API serialises a date as. */
  tanggal_tm?: string | null;
  /** Server-derived; used only when the record carries no planting data at all. */
  maturitas?: Maturitas | null;
}

/** Maturity of a stand on an estate day (`YYYY-MM-DD`): the TM date wins, else the planting year. */
export function maturityOn(stand: Stand | null | undefined, day: string): Maturitas | null {
  if (!stand || !day) return null;
  const age = stand.tahun_tanam == null ? null : Number(day.slice(0, 4)) - stand.tahun_tanam;
  if (stand.tanggal_tm) {
    if (day < stand.tanggal_tm.slice(0, 10)) return 'TBM';
    return age !== null && age >= OLD_STAND_YEARS ? 'TUA' : 'TM';
  }
  if (age === null || age < 0) return stand.tahun_tanam == null ? stand.maturitas ?? null : null;
  return age < IMMATURE_YEARS ? 'TBM' : age < OLD_STAND_YEARS ? 'TM' : 'TUA';
}

/** The parcel's own planting data when it has any, otherwise its block's. */
export function standMaturityOn(lahan: Stand | null | undefined, blok: Stand | null | undefined, day: string) {
  const own = lahan && (lahan.tanggal_tm || lahan.tahun_tanam != null) ? lahan : blok;
  return maturityOn(own, day);
}

/** A Panen on TBM land cannot be queued or submitted without a stated reason. */
export function tbmReasonMissing(
  input: { lahan?: Stand | null; blok?: Stand | null; day: string; alasan?: string | null },
): boolean {
  return !input.alasan?.trim() && standMaturityOn(input.lahan, input.blok, input.day) === 'TBM';
}
