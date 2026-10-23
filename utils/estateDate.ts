const WIB_MS = 7 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Estate calendar uses WIB (UTC+7), independent of the device timezone.
export function estateDate(date = new Date()): string {
  return new Date(date.getTime() + WIB_MS).toISOString().slice(0, 10);
}

/**
 * "23 Okt 2026" on the estate (WIB) calendar, whatever the device zone, for a
 * `YYYY-MM-DD` day or a full ISO timestamp. The API sends document dates as
 * timestamps, which must never reach the screen raw.
 */
export function formatEstateDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const [year, month, day] = estateDate(date).split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "23 Okt 2026, 14.05 WIB": a moment, such as a truck's departure, on the estate clock. */
export function formatEstateDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = new Date(date.getTime() + WIB_MS).toISOString().slice(11, 16).replace(':', '.');
  return `${formatEstateDate(value)}, ${time} WIB`;
}
