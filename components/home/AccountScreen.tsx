import React, { useState } from 'react';
import { QueueInspection } from '@/components/bkm/QueueInspection';
import { recoveryItems } from '@/utils/queue-recovery';
import { latestQueueDocument } from '@/services/queue-recovery';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PageHeader } from '@/components/core/PageHeader';
import { BrandColors } from '@/constants/Colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import type { SyncErrorClass, SyncQueueItem } from '@/types/sync';
import { formatSyncResult } from '@/services/sync.service';

/**
 * Plain language for why an item stopped, because the person reading this is a
 * mandor in a block, not whoever wrote the API.
 */
function describeError(errorClass: SyncErrorClass | null, item?: Pick<SyncQueueItem, 'module' | 'action' | 'payload'>): string {
  // An SPB trip stopped on a taken number or a collected restan: the fix is on this phone, not a newer server copy.
  if (errorClass === 'CONFLICT' && item?.module === 'bkm_checker' && item.payload?.conflict) {
    return 'SPB ditolak server dan perlu diperbaiki. Buka Periksa untuk memperbaikinya, lalu kirim ulang.';
  }
  // A ticket or weighing stopped on a taken ticket number, a second ticket or weighing for the SPB, or a retired V3 QR.
  if ((item?.module === 'krani_timbang' || item?.module === 'tiket_pks') && item.payload?.conflict) {
    return 'Ditolak server dan perlu diperbaiki. Buka Periksa untuk memperbaikinya, lalu kirim ulang.';
  }
  // A weighing is refused on the SPB itself, not because someone edited it, and
  // re-sending the same numbers gets the same answer.
  if (errorClass === 'CONFLICT' && item?.module === 'krani_timbang' && item.action === 'CREATE') {
    return 'Timbangan ditolak server: truk, sopir, atau tujuan tidak cocok dengan Checker, SPB sudah ditimbang, atau jumlah janjang berbeda. Buang item ini lalu input ulang timbangan sesuai SPB.';
  }
  switch (errorClass) {
    case 'CONFLICT':
      return 'Dokumen sudah diubah orang lain. Periksa versi terbaru sebelum mengirim ulang.';
    case 'VALIDATION':
      return 'Data ditolak server. Mengirim ulang tidak akan berhasil tanpa perbaikan.';
    case 'AUTH':
      return 'Sesi berakhir saat mengirim. Masuk kembali lalu coba lagi.';
    case 'UNSUPPORTED':
      return 'Aplikasi tidak mengenali data ini. Perbarui aplikasi.';
    default:
      return 'Gagal terkirim setelah beberapa percobaan.';
  }
}

const MODULE_LABELS: Record<string, string> = {
  bkm_panen: 'BKM Panen',
  bkm_checker: 'BKM Checker',
  bkm_rawat: 'BKM Rawat',
  bkm_rawat_detail: 'Detail BKM Rawat',
  observasi: 'Observasi Lapangan',
  pemakaian_kendaraan: 'Pemakaian Kendaraan',
  bkm_checker_detail: 'Detail BKM Checker',
  krani_timbang: 'Timbangan',
  tiket_pks: 'Tiket PKS',
  krani_timbang_detail: 'Detail timbangan',
};

const describeModule = (module: string) => MODULE_LABELS[module] ?? module;

export function AccountScreen() {
  const { user, roles, logout } = useAuthStore();
  const { isOnline, connectionLabel } = useNetworkStatus();
  const { triggerSync, syncPhase, syncDetail, pendingCount } = useSync();
  const isProcessing = useSyncQueueStore((state) => state.isProcessing);
  const retryItem = useSyncQueueStore((state) => state.retryItem);
  const discardItem = useSyncQueueStore((state) => state.discardItem);
  // Dead items are the ones the queue has stopped trying on its own. They wait
  // here for a person rather than disappearing, because in the field a dropped
  // item is a morning's work nobody can get back.
  const failedItems = recoveryItems(useSyncQueueStore((state) => state.queue));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inspected, setInspected] = useState<SyncQueueItem | null>(null);
  const isSyncing = isProcessing || syncPhase === 'pushing' || syncPhase === 'pulling';

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    const result = await triggerSync();
    const title = result.error ? 'Sinkronisasi Gagal'
      : result.pushFailed > 0 || !result.pulled ? 'Sinkronisasi Sebagian' : 'Sinkronisasi Berhasil';
    Alert.alert(title, formatSyncResult(result));
  };

  const handleDiscard = (item: SyncQueueItem) =>
    Alert.alert(
      'Buang perubahan ini?',
      `${describeModule(item.module)} · ${item.action}. Data ini tidak akan pernah terkirim dan tidak bisa dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buang', style: 'destructive', onPress: () => { void discardItem(item.id).catch((error) => Alert.alert('Belum dapat dibuang', error.message)); } },
      ]
    );

  const handleRetry = async (item: SyncQueueItem) => {
    try {
      if (!isOnline) throw new Error('Hubungkan internet untuk memeriksa versi terbaru.');
      const payload = item.payload ?? {};
      const businessEdit = item.action === 'UPDATE' && ('header' in payload || 'data' in payload && !(payload.data as { status?: string }).status) || item.module.endsWith('_detail');
      const latest = item.errorClass === 'CONFLICT' && (payload.documentId || payload.id || payload.bkm_rawat_id) ? await latestQueueDocument(item) : null;
      if (businessEdit && latest && latest.status !== 'DRAFT') throw new Error('Dokumen server bukan DRAFT. Buka kembali dokumen revisi sebelum mencoba perubahan ini.');
      const baseline = item.module.endsWith('_detail') && latest
        ? ((latest.details ?? latest.detail_rawat ?? []) as { id: string; modified_at?: string }[]).find((detail) => detail.id === payload.id)?.modified_at
        : latest?.modified_at;
      Alert.alert('Kirim ulang perubahan?', latest ? 'Perubahan lokal akan diterapkan pada versi server yang baru diperiksa. Pastikan data pada menu Periksa sudah sesuai.' : 'Kirim ulang data yang tersimpan di perangkat?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kirim ulang', onPress: () => { void retryItem(item.id, typeof baseline === 'string' ? baseline : undefined).catch((error) => Alert.alert('Gagal', error.message)); } },
      ]);
    } catch (error) { Alert.alert('Belum dapat dikirim', (error as Error).message); }
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
      {inspected && <QueueInspection item={inspected} onClose={() => setInspected(null)} />}
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
            <View style={{ gap: 12 }}>
              <Text style={styles.cardTitle}>{failedItems.length} perubahan perlu ditinjau</Text>
              {failedItems.map((item) => (
                <View key={item.id} style={styles.failedItem}>
                  <Text style={styles.failedTitle}>
                    {describeModule(item.module)} · {item.action}
                  </Text>
                  <Text style={styles.failedReason}>{item.status === 'DEAD' ? describeError(item.errorClass, item) : 'Menunggu perubahan sebelumnya diselesaikan.'}</Text>
                  {item.lastError ? (
                    <Text style={styles.secondary} numberOfLines={3}>{item.lastError}</Text>
                  ) : null}
                  <Text style={styles.secondary}>
                    {new Date(item.createdAt).toLocaleString('id-ID')} · {item.retryCount} percobaan
                  </Text>
                  <View style={styles.failedActions}>
                    <Pressable accessibilityRole="button" onPress={() => setInspected(item)} style={styles.smallButton}>
                      <Text style={styles.smallButtonLabel}>Periksa</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={item.status !== 'DEAD'} onPress={() => void handleRetry(item)}
                      style={({ pressed }) => [styles.smallButton, pressed && styles.dimmed]}>
                      <FontAwesome name="refresh" size={14} color={BrandColors.primary} />
                      <Text style={styles.smallButtonLabel}>Coba lagi</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => handleDiscard(item)}
                      style={({ pressed }) => [styles.smallButton, pressed && styles.dimmed]}>
                      <FontAwesome name="trash" size={14} color={BrandColors.error} />
                      <Text style={[styles.smallButtonLabel, styles.logout]}>Buang</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={styles.secondary}>
                Data tetap tersimpan di perangkat sampai kamu memilih. Tidak ada yang terhapus sendiri.
              </Text>
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
  failedItem: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: BrandColors.background },
  failedTitle: { fontSize: 15, fontWeight: '600', color: BrandColors.textPrimary },
  failedReason: { fontSize: 14, lineHeight: 21, color: BrandColors.error },
  failedActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  smallButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: BrandColors.cardBg },
  smallButtonLabel: { fontSize: 14, fontWeight: '600', color: BrandColors.primary },
  syncButton: { minHeight: 48, borderRadius: 12, padding: 14, backgroundColor: BrandColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  syncLabel: { color: BrandColors.white, fontWeight: '600', flexShrink: 1 },
  row: { minHeight: 56, padding: 18, backgroundColor: BrandColors.cardBg, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowLabel: { flex: 1, fontSize: 16, color: BrandColors.textPrimary },
  logout: { color: BrandColors.error },
  dimmed: { opacity: 0.5 },
});
