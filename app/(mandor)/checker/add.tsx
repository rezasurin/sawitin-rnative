import { OperationalCreateGuard } from '@/components/core/OperationalCreateGuard';
import { BKMCheckerForm } from '@/components/mandor/BKMCheckerForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function CheckerAddScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <PageHeader
        title="SPB Truk Baru"
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
