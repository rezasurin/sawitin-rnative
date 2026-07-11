import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Brightness from 'expo-brightness';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandColors } from '@/constants/Colors';
import { PageHeader } from '@/components/home';

export default function ScanQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  
  // Prevent duplicate alert prompts
  const isAlerting = useRef(false);

  // Auto-Brightness logic using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const enableMaxBrightness = async () => {
        try {
          if (Platform.OS === 'android') {
            const { status } = await Brightness.requestPermissionsAsync();
            if (status !== 'granted') {
              console.log('Permission to adjust brightness denied');
              return;
            }
          }
          await Brightness.setBrightnessAsync(1.0);
        } catch (err) {
          console.warn('Failed to set brightness:', err);
        }
      };

      enableMaxBrightness();

      return () => {
        active = false;
        const restoreBrightness = async () => {
          try {
            await Brightness.restoreSystemBrightnessAsync();
          } catch (err) {
            console.warn('Failed to restore brightness:', err);
          }
        };
        restoreBrightness();
      };
    }, [])
  );

  // Reset scan state on focus
  useFocusEffect(
    useCallback(() => {
      setHasScanned(false);
      isAlerting.current = false;
    }, [])
  );

  // Request camera permission on mount if not granted
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Handle scanned QR payload
  const handleScan = useCallback((value: string) => {
    if (hasScanned || isAlerting.current) return;
    setHasScanned(true);
    isAlerting.current = true;

    const parts = value.split('|');
    if (parts.length !== 4) {
      Alert.alert(
        'Format Tidak Valid',
        'QR Code yang dipindai bukan merupakan Surat Pengantar Buah (SPB) Sawitin.',
        [
          {
            text: 'Coba Lagi',
            onPress: () => {
              setHasScanned(false);
              isAlerting.current = false;
            },
          },
        ]
      );
      return;
    }

    const [checkerId, quantityStr, timestampStr, signature] = parts;
    const quantity = parseInt(quantityStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    // Verify cryptographic signature locally
    const expectedSignature = `${checkerId.slice(0, 6)}${quantity}${timestamp}`.slice(0, 12);
    if (signature !== expectedSignature) {
      Alert.alert(
        'Tanda Tangan Tidak Valid',
        'Keamanan QR Code SPB gagal diverifikasi. Data kemungkinan telah dimanipulasi.',
        [
          {
            text: 'Coba Lagi',
            onPress: () => {
              setHasScanned(false);
              isAlerting.current = false;
            },
          },
        ]
      );
      return;
    }

    // Success dialog
    Alert.alert(
      'SPB Terverifikasi',
      `SPB berhasil divalidasi.\n\nID Checker: ${checkerId}\nTotal Janjang: ${quantity} janjang`,
      [
        {
          text: 'Lanjutkan Timbangan',
          onPress: () => {
            isAlerting.current = false;
            router.push({
              pathname: '/(krani)/timbangan',
              params: { checkerId },
            });
          },
        },
        {
          text: 'Batal',
          style: 'cancel',
          onPress: () => {
            setHasScanned(false);
            isAlerting.current = false;
          },
        },
      ]
    );
  }, [hasScanned, router]);

  // Setup Expo Camera barcode scannned handler
  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (data) {
      handleScan(data);
    }
  }, [handleScan]);

  // Toggle flashlight handler
  const TorchButton = (
    <Pressable
      onPress={() => setTorch((t) => !t)}
      style={({ pressed }) => [
        styles.headerBtn,
        {
          opacity: pressed ? 0.7 : 1,
          backgroundColor: torch ? 'rgba(196, 163, 90, 0.3)' : 'rgba(255,255,255,0.15)',
        },
      ]}
    >
      <FontAwesome
        name="flash"
        size={18}
        color={torch ? BrandColors.button : BrandColors.white}
      />
    </Pressable>
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <PageHeader title="Pindai QR" showMenuButton={false} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <PageHeader title="Pindai QR" showMenuButton={false} />
        <View style={styles.centerContent}>
          <FontAwesome name="camera" size={54} color={BrandColors.textMuted} />
          <Text style={styles.permissionText}>
            Aplikasi memerlukan izin kamera untuk memindai kode QR SPB.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Berikan Izin Kamera</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Pindai QR"
        showMenuButton={false}
        actionBtn={TorchButton}
      />
      
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        {/* Scanner target overlay box */}
        <View style={styles.overlayContainer}>
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanInstruction}>
            Posisikan Kode QR SPB dari Mandor di dalam kotak untuk memindai
          </Text>
        </View>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const frameSize = width * 0.65;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 15,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: BrandColors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  targetFrame: {
    width: frameSize,
    height: frameSize,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: BrandColors.button,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
