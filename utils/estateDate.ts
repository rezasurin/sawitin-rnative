// Estate calendar uses WIB (UTC+7), independent of the device timezone.
export function estateDate(date = new Date()): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
