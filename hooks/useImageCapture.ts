import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

/** One camera photo, or null when cancelled, refused or failed. */
export function useImageCapture() {
  const [loading, setLoading] = useState(false);

  const captureFromCamera = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return null;
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      return result.canceled ? null : result.assets[0] ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { captureFromCamera, loading };
}
