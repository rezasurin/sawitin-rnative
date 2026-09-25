import { useEffect, useRef } from 'react';

import { blokApi } from '@/services/blok.service';
import { kelompokLahanApi } from '@/services/kelompok-lahan.service';
import { lahanApi } from '@/services/lahan.service';
import { pekerjaApi } from '@/services/pekerja.service';
import { tipePekerjaanApi } from '@/services/tipe-pekerjaan.service';
import { tphApi } from '@/services/tph.service';
import { kendaraanApi, supirApi } from '@/services/vehicle-usage.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { bkmRawatApi } from '@/services/bkm-rawat.service';

/**
 * Fills the master-data cache once per signed-in user, so a field form works
 * offline even if the user never opened it while connected. Without this, the
 * cache only holds what a screen happened to fetch, and a mandor who signs in
 * at the office and drives straight out finds empty pickers.
 *
 * Failures are ignored: warming up offline simply does nothing, and every
 * screen still falls back to whatever is already stored.
 *
 * The page size matches what the field forms request, because the cache is
 * keyed by params. Browse-only screens that ask for a different size still
 * work online and are not warmed here.
 */
const FIELD_FORM_PAGE = { limit: 200 };

export function useMasterCacheWarmup() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const canReadRawat = useAuthStore((state) => state.hasPermission('mod_bkm_rawat', 'read'));
  const canReadVehicles = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'read'));
  const warmedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId || warmedFor.current === userId) return;
    warmedFor.current = userId;

    void Promise.allSettled([
      kelompokLahanApi.getAll(FIELD_FORM_PAGE),
      blokApi.getAll(FIELD_FORM_PAGE),
      lahanApi.getAll(FIELD_FORM_PAGE),
      tphApi.getAll(FIELD_FORM_PAGE),
      pekerjaApi.getAll(FIELD_FORM_PAGE),
      tipePekerjaanApi.getAll(FIELD_FORM_PAGE),
      ...(canReadVehicles ? [kendaraanApi.getAll(FIELD_FORM_PAGE), supirApi.getAll(FIELD_FORM_PAGE)] : []),
      ...(canReadRawat ? [bkmRawatApi.getLookups()] : []),
    ]);
  }, [isAuthenticated, userId, canReadRawat, canReadVehicles]);
}
