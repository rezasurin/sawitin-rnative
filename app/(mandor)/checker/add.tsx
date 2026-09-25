import { OperationalCreateGuard } from '@/components/core/OperationalCreateGuard';
import { BKMCheckerForm } from '@/components/mandor/BKMCheckerForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

export default function CheckerAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ blok_id?: string; tph_id?: string; lahan_id?: string; bkm_panen_id?: string; tanggal_laporan?: string }>();
  const setHeader = useBkmCheckerStore((state) => state.setHeader);
  useEffect(() => {
    if (!params.blok_id || !params.tph_id || !params.tanggal_laporan) return;
    setHeader({ blok_id: params.blok_id, tph_id: params.tph_id,
      lahan_id: params.lahan_id || undefined, bkm_panen_id: params.bkm_panen_id || undefined,
      tanggal_laporan: params.tanggal_laporan });
  }, [params.blok_id, params.tph_id, params.lahan_id, params.bkm_panen_id, params.tanggal_laporan, setHeader]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="BKM Checker Baru"
        showBackButton
        onBack={() => router.back()}
      />
      <OperationalCreateGuard module="bkmChecker"><BKMCheckerForm onSuccess={() => router.back()} /></OperationalCreateGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
