import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PageHeader } from '@/components/core/PageHeader';
import { BrandColors } from '@/constants/Colors';
import { ADMIN_MODULES, UNAVAILABLE_ADMIN_MODULES } from '@/constants/adminMenu';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AdminMenuScreen() {
  const router = useRouter();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <View style={styles.container}>
      <PageHeader title="Semua Menu" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Operasional</Text>
        {ADMIN_MODULES.map((item) => {
          const allowed = hasPermission(item.permission, 'read');
          return (
            <Pressable key={item.route} accessibilityRole="button" disabled={!allowed}
              accessibilityLabel={item.title} accessibilityState={{ disabled: !allowed }}
              accessibilityHint={allowed ? item.description : 'Anda tidak memiliki izin untuk modul ini'}
              onPress={() => router.navigate(`/(admin)/${item.route}` as never)}
              style={({ pressed }) => [styles.row, (pressed || !allowed) && styles.dimmed]}>
              <View style={styles.icon}><FontAwesome name={item.icon} size={23} color={BrandColors.primary} /></View>
              <View style={styles.labels}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{allowed ? item.description : 'Tidak memiliki akses'}</Text>
              </View>
              <FontAwesome name={allowed ? 'angle-right' : 'lock'} size={22} color={BrandColors.textMuted} />
            </Pressable>
          );
        })}
        <Text style={styles.heading}>Administrasi</Text>
        {UNAVAILABLE_ADMIN_MODULES.map((title) => (
          <View key={title} style={[styles.row, styles.dimmed]} accessible accessibilityLabel={`${title}, belum tersedia`}>
            <FontAwesome name="clock-o" size={22} color={BrandColors.textMuted} />
            <View style={styles.labels}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>Belum tersedia</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  heading: { fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 76, backgroundColor: BrandColors.cardBg, borderRadius: 14 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EDF0E5', alignItems: 'center', justifyContent: 'center' },
  labels: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary },
  description: { fontSize: 13, lineHeight: 19, color: BrandColors.textSecondary },
  dimmed: { opacity: 0.5 },
});
