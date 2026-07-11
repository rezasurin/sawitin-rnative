import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

interface LocationResult {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  location: LocationResult | null;
  loading: boolean;
  error: string | null;
  captureLocation: () => Promise<LocationResult | null>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(async (): Promise<LocationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Use the raw permission API — works across all expo-location versions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Izin lokasi ditolak');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: LocationResult = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setLocation(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil lokasi';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, captureLocation };
}
