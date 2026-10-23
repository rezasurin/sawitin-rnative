import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/core/Button';
import { AuthenticatedImage } from '@/components/core/AuthenticatedImage';
import { BrandColors } from '@/constants/Colors';
import { MAX_FOTO, type FotoItem } from '@/utils/foto';

// The JPEG quality `useImageCapture` uses: readable ticket text at a fraction of the size.
const QUALITY = 0.8;

interface FormPhotoFieldProps {
  label: string;
  value: FotoItem[];
  onChange: (foto: FotoItem[]) => void;
  disabled?: boolean;
}

/** Up to five photos from the camera or the gallery, shown as removable thumbnails. */
export function FormPhotoField({ label, value, onChange, disabled }: FormPhotoFieldProps) {
  const room = MAX_FOTO - value.length;
  const add = (uris: string[]) => onChange([
    ...value,
    ...uris.filter((uri) => !value.some((item) => item.url === uri)).slice(0, room).map((url) => ({ url })),
  ]);
  const capture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Izin kamera ditolak', 'Izinkan kamera di pengaturan untuk mengambil foto.'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: QUALITY });
      if (!result.canceled) add(result.assets.map((asset) => asset.uri));
    } catch (error) {
      Alert.alert('Gagal mengambil foto', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };
  const pick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Izin galeri ditolak', 'Izinkan galeri di pengaturan untuk memilih foto.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true, selectionLimit: room, quality: QUALITY,
      });
      if (!result.canceled) add(result.assets.map((asset) => asset.uri));
    } catch (error) {
      Alert.alert('Gagal memilih foto', error instanceof Error ? error.message : 'Coba lagi.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label} ({value.length}/{MAX_FOTO})</Text>
      {value.length === 0 && <Text style={styles.muted}>Belum ada foto.</Text>}
      <View style={styles.grid}>
        {value.map((item, index) => (
          <View key={item.url} style={styles.cell}>
            <AuthenticatedImage uri={item.url} style={styles.thumb} />
            {!disabled && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hapus foto ${index + 1}`}
                hitSlop={8}
                onPress={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Text style={styles.remove}>Hapus</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {!disabled && room > 0 && (
        <View style={styles.actions}>
          <Button title="Ambil foto" variant="secondary" onPress={() => void capture()} />
          <Button title="Pilih dari galeri" variant="secondary" onPress={() => void pick()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: BrandColors.textPrimary },
  muted: { color: BrandColors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { alignItems: 'center', gap: 4 },
  thumb: { width: 96, height: 96, borderRadius: 4 },
  remove: { color: BrandColors.error, fontWeight: '500', paddingVertical: 4 },
  actions: { gap: 8 },
});
