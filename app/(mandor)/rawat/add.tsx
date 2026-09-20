import { BKMRawatForm } from '@/components/mandor/BKMRawatForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function AddRawatScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah BKM Rawat"
        showBackButton
        onBack={() => router.back()}
      />
      <BKMRawatForm onSuccess={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
