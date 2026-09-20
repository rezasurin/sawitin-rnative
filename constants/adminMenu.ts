export const ADMIN_MODULES = [
  { route: 'bkm', title: 'BKM Panen', description: 'Dokumen panen dan persetujuan', icon: 'book', permission: 'mod_bkm_panen' },
  { route: 'checker', title: 'Checker', description: 'Pemeriksaan buah dan pengiriman', icon: 'check-circle-o', permission: 'mod_bkm_checker' },
  { route: 'timbangan', title: 'Timbangan', description: 'Riwayat timbangan dan pindai QR', icon: 'balance-scale', permission: 'mod_krani_timbang' },
  { route: 'rawat', title: 'BKM Rawat', description: 'Dokumen perawatan kebun', icon: 'leaf', permission: 'mod_bkm_rawat' },
  { route: 'material', title: 'Material', description: 'Daftar dan tambah material', icon: 'cube', permission: 'mod_material' },
] as const;

export const UNAVAILABLE_ADMIN_MODULES = ['Master Data', 'Pengguna', 'Laporan'] as const;
