import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { ADMIN_MODULES } from '@/constants/adminMenu';
import { BrandColors } from '@/constants/Colors';

export function AdminModuleGuard({ module, children }: {
  module: typeof ADMIN_MODULES[number]['route'];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const config = ADMIN_MODULES.find((item) => item.route === module)!;
  if (hasPermission(config.permission, 'read')) return <>{children}</>;
  return (
    <View style={styles.container}>
      <Text>Akses ditolak</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(admin)/menu')} style={styles.button}>
        <Text style={styles.label}>Kembali ke Menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, backgroundColor: BrandColors.background },
  button: { padding: 16, borderRadius: 12, backgroundColor: BrandColors.primary },
  label: { color: BrandColors.white, fontWeight: '600' },
});
