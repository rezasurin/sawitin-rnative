import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/home';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import { ClosePreview, Section } from '@/components/close/ClosePreview';
import { BrandColors } from '@/constants/Colors';
import { useOrgSetting } from '@/hooks/useOrgConfig';
import { useCloseDetail, usePendingCloses } from '@/hooks/useTutupHarian';
import { tutupHarianApi } from '@/services/tutup-harian.service';
import { tutupHarianKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { CLOSE_OFFLINE_TEXT, approvalBlock, closeFailure, isOwnClose, pastDeadline } from '@/utils/close';

/** Asisten: closes waiting for approval, newest day first. Late ones are flagged. */
export function CloseListScreen() {
  const router = useRouter();
  const online = useNetworkStore((state) => state.isOnline);
  const jam = useOrgSetting('batas_approval_jam');
  const timezone = useOrgSetting('timezone');
  const list = usePendingCloses();
  return <View style={styles.screen}>
    <PageHeader title="Persetujuan Tutup Harian" showBackButton onBack={() => router.back()} />
    {!online && <Text style={styles.offline}>{CLOSE_OFFLINE_TEXT}. Sambungkan perangkat untuk melihat daftar.</Text>}
    {online && list.isLoading && <ActivityIndicator style={{ marginTop: 40 }} />}
    {online && list.isError && <View style={styles.pad}><Text style={styles.error}>{closeFailure(list.error).text}</Text>
      <Button title="Coba lagi" variant="secondary" onPress={() => void list.refetch()} /></View>}
    {online && list.data && <FlatList data={list.data} keyExtractor={(item) => item.id} contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
      ListEmptyComponent={<Text style={styles.muted}>Tidak ada tutup harian yang menunggu persetujuan.</Text>}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => router.push(`/(asisten)/tutup-harian/${item.id}` as never)}>
        <View style={styles.row}>
          <Text style={styles.bold}>{item.kelompok_lahan.nama}</Text>
          {pastDeadline(item.tanggal, jam, timezone) && <Badge label="Terlambat" color={BrandColors.error} bg="#FFEBEE" />}
        </View>
        <Text>{item.tanggal}</Text>
        <Text style={styles.muted}>Diajukan oleh {item.submitted_by ?? '—'}</Text>
      </TouchableOpacity>} />}
  </View>;
}

/** Asisten: the same preview the Mandor submitted, with the Mandor's notes, then approve or reject. */
export function CloseDetailScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useNetworkStore((state) => state.isOnline);
  const { hasPermission, user } = useAuthStore();
  const canApprove = hasPermission('mod_bkm_checker', 'approve') && hasPermission('mod_bkm_panen', 'approve');
  const detail = useCloseDetail(id);
  const preview = online ? detail.data : undefined;
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (action: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(true);
    try {
      const done = action === 'approve' ? await tutupHarianApi.approve(id) : await tutupHarianApi.reject(id, reason.trim());
      client.setQueryData(tutupHarianKeys.detail(id), done);
      await client.invalidateQueries({ queryKey: tutupHarianKeys.pending() });
      Alert.alert(action === 'approve' ? 'Disetujui' : 'Ditolak', action === 'approve' ? 'Panen dan trip hari itu kini disetujui.' : 'Mandor akan memperbaiki lalu mengajukan ulang.',
        [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      const failure = closeFailure(error);
      if (failure.refetch) { await detail.refetch(); await client.invalidateQueries({ queryKey: tutupHarianKeys.pending() }); }
      Alert.alert('Belum berhasil', failure.text);
    } finally { setBusy(false); }
  };

  const block = approvalBlock({ online, preview, userCode: user?.user_code, canApprove });
  const own = isOwnClose(preview, user?.user_code);
  return <View style={styles.screen}>
    <PageHeader title="Tutup Harian" showBackButton onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.pad}>
      {!online && <Text style={styles.offline}>{CLOSE_OFFLINE_TEXT}. Sambungkan perangkat untuk membuka detail.</Text>}
      {online && detail.isLoading && <ActivityIndicator />}
      {online && detail.isError && <View style={styles.stack}><Text style={styles.error}>{closeFailure(detail.error).text}</Text>
        <Button title="Coba lagi" variant="secondary" onPress={() => void detail.refetch()} /></View>}
      {preview && <>
        <Text style={styles.bold}>{preview.tanggal}</Text>
        <ClosePreview preview={preview} />
        {preview.tutup_harian?.status === 'SUBMITTED' && <Section title="Keputusan">
          {own && <Text style={styles.muted}>Anda yang mengajukan tutup harian ini, jadi tidak dapat menyetujuinya.</Text>}
          {!own && block && <Text style={styles.error}>{block}</Text>}
          {!own && <Button title="Setujui" disabled={!!block || busy} loading={busy}
            onPress={() => Alert.alert('Setujui tutup harian?', 'Semua Panen dan trip hari itu disetujui sekaligus.', [{ text: 'Batal', style: 'cancel' }, { text: 'Setujui', onPress: () => void decide('approve') }])} />}
          <TextInput accessibilityLabel="Alasan penolakan" style={styles.input} multiline maxLength={500} value={reason} onChangeText={setReason} placeholder="Alasan penolakan (wajib)" editable={!busy && online} />
          <Button title="Tolak" variant="danger" disabled={!online || !canApprove || !reason.trim() || busy}
            onPress={() => Alert.alert('Tolak tutup harian?', 'Mandor harus memperbaiki dan mengajukan ulang.', [{ text: 'Batal', style: 'cancel' }, { text: 'Tolak', style: 'destructive', onPress: () => void decide('reject') }])} />
        </Section>}
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BrandColors.background },
  pad: { padding: 16, gap: 12, paddingBottom: 120 },
  stack: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { padding: 14, borderRadius: 10, backgroundColor: BrandColors.cardBg, gap: 4 },
  bold: { fontWeight: '700', fontSize: 16, color: BrandColors.textPrimary },
  muted: { color: BrandColors.textSecondary },
  error: { color: BrandColors.error },
  offline: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: '#FFF3E0', color: BrandColors.error, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, backgroundColor: '#FFF' },
});
