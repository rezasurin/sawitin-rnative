import { BKMRawatForm } from '@/components/mandor/BKMRawatForm';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function AddRawatScreen() {
  const router = useRouter();

  const BackButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Tambah BKM Rawat"
        showMenuButton={false}
        actionBtn={BackButton}
      />
      <BKMRawatForm onSuccess={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
});
