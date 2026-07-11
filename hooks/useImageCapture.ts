import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useCallback, useState } from 'react';

interface ImageResult {
  uri: string;
  base64?: string;
  width: number;
  height: number;
}

interface UseImageCaptureReturn {
  image: ImageResult | null;
  loading: boolean;
  error: string | null;
  captureFromCamera: () => Promise<ImageResult | null>;
  pickFromGallery: () => Promise<ImageResult | null>;
  clearImage: () => void;
}

export function useImageCapture(): UseImageCaptureReturn {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processResult = useCallback(async (result: ImagePicker.ImagePickerResult): Promise<ImageResult | null> => {
    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];

    // Read as base64 for offline storage
    let base64: string | undefined;
    try {
      base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
    } catch {
      // base64 is optional — degrade gracefully if read fails
      base64 = undefined;
    }

    const processed: ImageResult = {
      uri: asset.uri,
      base64,
      width: asset.width,
      height: asset.height,
    };

    setImage(processed);
    return processed;
  }, []);

  const captureFromCamera = useCallback(async (): Promise<ImageResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Izin kamera ditolak');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: false, // read manually via FileSystem
      });

      return await processResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil foto';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [processResult]);

  const pickFromGallery = useCallback(async (): Promise<ImageResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Izin galeri ditolak');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      return await processResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memilih foto';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [processResult]);

  const clearImage = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  return { image, loading, error, captureFromCamera, pickFromGallery, clearImage };
}
