import { BKMCheckerForm } from '@/components/mandor/BKMCheckerForm';
import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function CheckerAddScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BrandColors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BKM Checker Baru</Text>
      </View>
      <BKMCheckerForm onSuccess={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: BrandColors.primary,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: BrandColors.white, fontSize: 14 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.white,
  },
});
