import { BKMRawatForm } from '@/components/mandor/BKMRawatForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function AddRawatScreen() {
  const router = useRouter();
  const group = useModuleGroup('(mandor)');

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah BKM Rawat"
        showBackButton
        onBack={() => router.back()}
      />
      <BKMRawatForm onSuccess={(id) => router.replace(`/${group}/rawat/${id}` as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
