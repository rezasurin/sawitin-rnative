import type { MeterTerakhir } from '@/types/vehicle-usage';
import { estateDate } from '@/utils/estateDate';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** "8 Okt 2026" on the estate (WIB) calendar, whatever the device zone. */
const estateDay = (iso: string) => {
  const [year, month, day] = estateDate(new Date(iso)).split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
};

/**
 * Meter awal once a vehicle's last reading has settled. Only an empty field or the form's own
 * earlier prefill is replaced; a value the user typed is never overwritten. No reading (none
 * yet, or offline with nothing stored) clears only a stale prefill from another vehicle.
 */
export function nextMeterStart(current: string, prefilled: string | null, last: MeterTerakhir | undefined): string {
  if (current.trim() && current !== prefilled) return current;
  return last?.meter_akhir ?? '';
}

/** The line under meter awal: the reading as information, or a warning when the typed value differs. Never blocks. */
export function meterHint(last: MeterTerakhir | undefined, current: string): { text: string; warn: boolean } | null {
  if (last?.meter_akhir == null || !last.tanggal) return null;
  const reading = `${Number(last.meter_akhir).toLocaleString('id-ID')} ${last.satuan_meter ?? ''}`.trim();
  const day = estateDay(last.tanggal);
  const source = last.cached ? ', dari data terakhir di perangkat' : '';
  if (current.trim() && Number(current) !== Number(last.meter_akhir)) {
    return { warn: true, text: `Meter awal berbeda dari meter akhir terakhir yang disetujui (${reading}, ${day}${source}). Selisih akan tercatat di laporan konsumsi BBM.` };
  }
  return { warn: false, text: `Meter terakhir yang disetujui: ${reading} (${day}${source}).` };
}
