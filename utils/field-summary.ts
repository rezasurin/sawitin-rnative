export const displayMeasure = (value: number | null | undefined): string =>
  value == null ? '—' : value.toLocaleString('id-ID');

export const isWholeKg = (value: string): boolean => {
  const text = value.trim();
  return /^(0|[1-9]\d*)$/.test(text) && Number.isSafeInteger(Number(text));
};

export const approvalLabel = (document: string): string => ({
  TUTUP_HARIAN: 'Tutup Harian', BKM_PANEN: 'BKM Panen', BKM_CHECKER: 'BKM Checker', BKM_RAWAT: 'BKM Rawat',
  KRANI_TIMBANG: 'Krani Timbang', PEMAKAIAN_KENDARAAN: 'Pemakaian Kendaraan',
  STOCK_OPNAME: 'Stok Opname', PENJUALAN: 'Penjualan',
} as Record<string, string>)[document] ?? document.replace(/_/g, ' ');

export function approvalTarget(document: string, group: string, canRead: (module: string) => boolean): string | null {
  // R11 v2: Panen and trips wait as one daily close, approved from the Asisten's list.
  if (document === 'TUTUP_HARIAN' && group === '(asisten)' && canRead('mod_bkm_checker')) {
    return '/(asisten)/tutup-harian';
  }
  if (document === 'BKM_PANEN' && (group === '(mandor)' || group === '(asisten)') && canRead('mod_bkm_panen')) {
    return `/${group}/bkm`;
  }
  if (document === 'BKM_CHECKER' && group === '(mandor)' && canRead('mod_bkm_checker')) {
    return '/(mandor)/checker';
  }
  return null;
}

export function generatedLocalTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
