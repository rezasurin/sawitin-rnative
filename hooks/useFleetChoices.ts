import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { kendaraanApi, supirApi } from '@/services/vehicle-usage.service';
import { bkmRawatApi } from '@/services/bkm-rawat.service';

/** The Mandor seed can read Rawat lookups but cannot read the fleet endpoints. */
export function useFleetChoices() {
  const canReadFleet = useAuthStore((state) => state.hasPermission('mod_krani_timbang', 'read'));
  const canReadRawat = useAuthStore((state) => state.hasPermission('mod_bkm_rawat', 'read'));
  const vehicles = useQuery({
    queryKey: ['kendaraan', 200], queryFn: () => kendaraanApi.getAll({ limit: 200 }),
    enabled: canReadFleet,
  });
  const drivers = useQuery({
    queryKey: ['supir', 200], queryFn: () => supirApi.getAll({ limit: 200 }),
    enabled: canReadFleet,
  });
  const rawat = useQuery({
    queryKey: ['bkmRawat', 'lookups'], queryFn: bkmRawatApi.getLookups,
    enabled: !canReadFleet && canReadRawat,
  });
  const vehicleRows = (canReadFleet ? vehicles.data?.data : rawat.data?.vehicles) ?? [];
  const driverRows = (canReadFleet ? drivers.data?.data : rawat.data?.drivers) ?? [];
  return {
    vehicles: vehicleRows.filter((row) => row.status === 'ACTIVE'),
    drivers: driverRows.filter((row) => row.status === 'ACTIVE'),
    loading: canReadFleet ? vehicles.isLoading || drivers.isLoading : rawat.isLoading,
  };
}
