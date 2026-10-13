import { useQuery } from '@tanstack/react-query';
import { pemakaianKendaraanApi } from '@/services/vehicle-usage.service';
import { pemakaianKendaraanKeys } from '@/services/queryKeys';

/** Prefill only: a failure leaves meter awal as it is, so it never retries or blocks. */
export function useMeterTerakhir(kendaraanId: string, satuanMeter: string) {
  return useQuery({
    queryKey: pemakaianKendaraanKeys.meterTerakhir(kendaraanId, satuanMeter),
    queryFn: () => pemakaianKendaraanApi.getMeterTerakhir(kendaraanId, satuanMeter),
    enabled: !!kendaraanId,
    retry: false,
  });
}
