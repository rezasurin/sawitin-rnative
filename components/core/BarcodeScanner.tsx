import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { BrandColors } from '@/constants/Colors';

/**
 * What an SPB book's serial can be printed as. QR stays for the old Sawitin SPB.
 * ponytail: no overlay frame or brightness handling like the weighing scanner;
 * add them if reading a printed serial in poor light proves hard.
 */
export const SPB_BARCODE_TYPES: BarcodeType[] = ['code128', 'ean13', 'code39', 'qr'];

interface Props {
  visible: boolean;
  onScanned: (value: string) => void;
  onClose: () => void;
}

/** Full-screen scanner for the SPB number. Typing the number stays the fallback. */
export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setDone(false)}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: SPB_BARCODE_TYPES }}
            // A camera reports the same code many times a second; take the first.
            onBarcodeScanned={done ? undefined : ({ data }) => {
              const value = data?.trim();
              if (!value) return;
              setDone(true);
              onScanned(value);
            }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.hint}>Izin kamera diperlukan untuk memindai barcode SPB. Nomor SPB juga bisa diketik.</Text>
            <Pressable accessibilityRole="button" style={styles.button}
              onPress={permission?.canAskAgain === false ? () => Linking.openSettings() : requestPermission}>
              <Text style={styles.buttonText}>{permission?.canAskAgain === false ? 'Buka Pengaturan Kamera' : 'Berikan Izin Kamera'}</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.hint}>Arahkan kamera ke barcode nomor pada SPB.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => setTorch((on) => !on)}>
            <Text style={styles.buttonText}>{torch ? 'Matikan senter' : 'Nyalakan senter'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Ketik manual</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'flex-end' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32 },
  hint: { color: '#fff', textAlign: 'center', padding: 16, fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 40, justifyContent: 'center' },
  button: { backgroundColor: BrandColors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: BrandColors.white, fontWeight: '700', fontSize: 14 },
});
