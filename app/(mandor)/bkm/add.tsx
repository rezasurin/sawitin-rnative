import { OperationalCreateGuard } from '@/components/core/OperationalCreateGuard';
import { BKMPanenForm } from '@/components/mandor/BKMPanenForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

export default function AddBkmScreen() {
  const router = useRouter();
  const reset = useBkmPanenStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah BKM"
        showBackButton
        onBack={() => router.back()}
      />
      <OperationalCreateGuard module="bkmPanen"><BKMPanenForm onSuccess={() => router.back()} /></OperationalCreateGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
