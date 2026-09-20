import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PageHeader } from '@/components/core/PageHeader';
import { BrandColors } from '@/constants/Colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncQueueStore, MAX_RETRIES } from '@/stores/useSyncQueueStore';
import { formatSyncResult } from '@/services/sync.service';

export function AccountScreen() {
  const { user, roles, logout } = useAuthStore();
  const { isOnline, connectionLabel } = useNetworkStatus();
  const { triggerSync, syncPhase, syncDetail, pendingCount } = useSync();
  const isProcessing = useSyncQueueStore((state) => state.isProcessing);
  const failedItems = useSyncQueueStore((state) => state.queue).filter((item) => item.retryCount >= MAX_RETRIES);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSyncing = isProcessing || syncPhase === 'pushing' || syncPhase === 'pulling';

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    const result = await triggerSync();
    const title = result.error ? 'Sinkronisasi Gagal'
      : result.pushFailed > 0 || !result.pulled ? 'Sinkronisasi Sebagian' : 'Sinkronisasi Berhasil';
    Alert.alert(title, formatSyncResult(result));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Gagal keluar', 'Silakan coba lagi.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Akun" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.identity}>
            <View style={styles.avatar}><FontAwesome name="user" size={28} color={BrandColors.primary} /></View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{user?.member?.nama || user?.username || 'Pengguna'}</Text>
              <Text style={styles.secondary}>@{user?.username}</Text>
            </View>
          </View>
          {user?.member?.email ? <Text style={styles.secondary}>{user.member.email}</Text> : null}
          <Text style={styles.secondary}>{roles.map((role) => role.nama).join(', ')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Data & sinkronisasi</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isOnline ? `Online · ${connectionLabel}` : 'Offline'}</Text>
          <Text style={styles.secondary}>
            {pendingCount > 0 ? `${pendingCount} perubahan menunggu dikirim` : 'Tidak ada perubahan yang menunggu dikirim'}
          </Text>
          <Text style={styles.secondary}>
            {isOnline ? 'Kirim perubahan tersimpan dan ambil data terbaru.' : 'Hubungkan internet untuk menyinkronkan data.'}
          </Text>
          {failedItems.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.cardTitle}>{failedItems.length} perubahan gagal dikirim</Text>
              {failedItems.map((item) => (
                <Text key={item.id} style={styles.secondary}>
                  {item.module} · {item.action} · {item.id} · {item.retryCount} percobaan
                </Text>
              ))}
              <Text style={styles.secondary}>Data tetap tersimpan. Sinkronkan untuk mencoba kembali; hubungi admin bila masih gagal.</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" disabled={!isOnline || isSyncing} onPress={handleSync}
            style={({ pressed }) => [styles.syncButton, (pressed || !isOnline || isSyncing) && styles.dimmed]}>
            {isSyncing ? <ActivityIndicator color={BrandColors.white} /> : <FontAwesome name="refresh" color={BrandColors.white} size={18} />}
            <Text style={styles.syncLabel}>{isSyncing ? syncDetail || 'Sinkronisasi berlangsung…' : failedItems.length > 0 ? 'Coba ulang & sinkronkan' : 'Sinkronkan sekarang'}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" style={styles.row}
          onPress={() => Alert.alert('Bantuan', 'Hubungi admin kebun untuk bantuan akun dan penggunaan aplikasi.')}>
          <FontAwesome name="question-circle" size={22} color={BrandColors.primary} />
          <Text style={styles.rowLabel}>Bantuan</Text>
          <FontAwesome name="angle-right" size={22} color={BrandColors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isLoggingOut || isSyncing} onPress={handleLogout}
          style={({ pressed }) => [styles.row, (pressed || isLoggingOut || isSyncing) && styles.dimmed]}>
          <FontAwesome name="sign-out" size={22} color={BrandColors.error} />
          <Text style={[styles.rowLabel, styles.logout]}>{isLoggingOut ? 'Keluar…' : 'Keluar'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: BrandColors.cardBg, borderRadius: 16, padding: 20, gap: 10 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  identityText: { flex: 1, gap: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDF0E5', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: BrandColors.textPrimary },
  secondary: { fontSize: 14, lineHeight: 21, color: BrandColors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary },
  cardTitle: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary },
  syncButton: { minHeight: 48, borderRadius: 12, padding: 14, backgroundColor: BrandColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  syncLabel: { color: BrandColors.white, fontWeight: '600', flexShrink: 1 },
  row: { minHeight: 56, padding: 18, backgroundColor: BrandColors.cardBg, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowLabel: { flex: 1, fontSize: 16, color: BrandColors.textPrimary },
  logout: { color: BrandColors.error },
  dimmed: { opacity: 0.5 },
});
