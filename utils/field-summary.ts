export const displayMeasure = (value: number | null | undefined): string =>
  value == null ? '—' : value.toLocaleString('id-ID');

export const isWholeKg = (value: string): boolean => {
  const text = value.trim();
  return /^(0|[1-9]\d*)$/.test(text) && Number.isSafeInteger(Number(text));
};

/**
 * A number typed the Indonesian or the English way: "6.355" and "6355" are 6355,
 * "12,5" and "12.5" are 12.5. A dot before groups of exactly three digits is a
 * thousands separator; anything else unclear is NaN, never a silent guess.
 */
export const parseDecimal = (value: string): number => {
  const text = value.trim();
  if (/^(0|[1-9]\d{0,2}(\.\d{3})*)(,\d+)?$/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'));
  if (/^\d+([.,]\d+)?$/.test(text)) return Number(text.replace(',', '.'));
  return NaN;
};

export const UNREADABLE_NUMBER = 'Angka tidak terbaca. Contoh: 6355, 6.355, atau 12,5.';

export const approvalLabel =(document: string): string => ({
  TUTUP_HARIAN: 'Tutup Harian', BKM_PANEN: 'BKM Panen', BKM_CHECKER: 'BKM Checker', BKM_RAWAT: 'BKM Rawat',
  KRANI_TIMBANG: 'Krani Timbang', PEMAKAIAN_KENDARAAN: 'Pemakaian Kendaraan',
  STOCK_OPNAME: 'Stok Opname', PENJUALAN: 'Penjualan',
  // Approved on web only, so approvalTarget gives it no link.
  PENERIMAAN_MATERIAL: 'Penerimaan Barang',
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
