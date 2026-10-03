import { BkmPanenList } from '@/components/bkm/BkmPanenList';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function BkmScreen() {
  const router = useRouter();
  const { status } = useLocalSearchParams<{ status?: string }>();

  return (
    <View style={styles.container}>
      <BkmPanenList
        onCardPress={(id) => router.push(`/(asisten)/bkm/${id}`)}
        emptyHint="Belum ada dokumen BKM Panen untuk direview"
        initialStatus={status ?? null}
        onStatusChange={(next) => router.setParams({ status: next ?? undefined })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
