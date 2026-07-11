import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/Colors';
import { PageHeader } from '@/components/home';

export default function UsersScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Pengguna" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.emptyText}>Manajemen pengguna</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: BrandColors.textMuted, fontSize: 14 },
});
