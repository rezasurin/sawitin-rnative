import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { Button } from '@/components/core/Button';
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useKraniTimbangList } from '@/hooks/useKraniTimbang';
import { useWaitingSpb } from '@/hooks/useWaitingSpb';
import { stagingApi } from '@/services/staging.service';
import { useQueryClient } from '@tanstack/react-query';
import type { WaitingSpbRow } from '@/utils/trip';
import type { KraniTimbang } from '@/types';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { estateDate } from '@/utils/estateDate';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

interface KraniTimbangHistoryProps {
  onCardPress: (id: string) => void;
  onScanPress: () => void;
  onTiketPress: () => void;
  /** `jembatan_timbang`: without a weighbridge there is nothing to scan, only mill tickets to enter. */
  weighbridge: boolean;
}

export function KraniTimbangHistory({ onCardPress, onScanPress, onTiketPress, weighbridge }: KraniTimbangHistoryProps) {
  const policy = useOperationalPolicy('kraniTimbang');
  const client = useQueryClient();
  const waiting = useWaitingSpb();
  const { data, isLoading, isError, refetch, isRefetching } = useKraniTimbangList({
    page: 1,
    limit: 100,
    sort: 'created_at:desc',
  });

  const allItems = data?.data ?? [];
  // `tanggal` is a DateTime, so compare estate (WIB) calendar days, not raw strings.
  const today = estateDate();
  const items = allItems.filter((i) => estateDate(new Date(i.tanggal)) === today);
  const refresh = () => { void refetch(); void waiting.refetch(); };
  const retry = (row: WaitingSpbRow) => stagingApi.retryPendingLog(row.id)
    .then(() => client.invalidateQueries({ queryKey: ['staging', 'waitingSpb'] }))
    .catch((error: unknown) => Alert.alert('Belum dapat dicoba lagi', error instanceof Error ? error.message : 'Coba lagi nanti.'));

  return (
    <View style={styles.container}>
      <PageHeader title="Timbangan" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TimbangCard item={item} onPress={() => onCardPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<>
          {policy.create && <Button title="Input tiket PKS (nomor SPB)" variant="secondary" onPress={onTiketPress} />}
          {!!waiting.data?.length && <View style={styles.waiting}>
            <Text style={styles.waitingTitle}>Menunggu SPB ({waiting.data.length})</Text>
            <Text style={styles.meta}>Diterima server; dicocokkan otomatis setelah SPB-nya dikirim Mandor. Tarik layar untuk memperbarui.</Text>
            {waiting.data.map((row) => <WaitingCard key={row.id} row={row} onRetry={() => void retry(row)} />)}
          </View>}
          {items.length > 0 ? <Text style={styles.headerCount}>{items.length} penimbangan hari ini</Text> : null}
        </>}
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="time-outline"
            emptyText="Belum ada timbangan hari ini"
            emptySubtext={weighbridge ? 'Pindai SPB untuk mulai penimbangan' : 'Tiket PKS menjadi berat acuan'}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            colors={[BrandColors.primary]}
          />
        }
      />

      {policy.create && weighbridge && <FAB label="Pindai SPB untuk timbangan baru" onPress={onScanPress} />}
    </View>
  );
}

function WaitingCard({ row, onRetry }: { row: WaitingSpbRow; onRetry: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{row.kind === 'TIKET' ? 'Tiket PKS' : 'Timbangan'} · SPB {row.nomor_spb}</Text>
      <Text style={styles.meta}>{row.failed ? `Gagal dicocokkan: ${row.message ?? 'tanpa keterangan'}` : 'Menunggu SPB'}</Text>
      <Text style={styles.meta}>Dikirim {new Date(row.created_at).toLocaleString('id-ID')}</Text>
      {row.failed && <Button title="Coba cocokkan lagi" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

function TimbangCard({ item, onPress }: { item: KraniTimbang; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="car-outline" size={18} color={BrandColors.primary} />
          <Text style={styles.title}>{item.nama_supir}</Text>
        </View>
        <DocStatusBadge status={item.status} />
      </View>
      <Text style={styles.meta}>Kendaraan: {item.nomor_kendaraan}</Text>
      {!!item.nomor_dokumen && <Text style={styles.meta}>Dokumen: {item.nomor_dokumen}</Text>}
      <Text style={styles.meta}>Tujuan: {item.tujuan_kirim}</Text>
      <Text style={styles.netto}>
        Netto: {item.netto?.toLocaleString('id-ID') ?? 0} kg
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { padding: 16, paddingBottom: 120 },
  waiting: { marginTop: 12, marginBottom: 8 },
  waitingTitle: { fontSize: 15, fontWeight: '700', color: BrandColors.textPrimary },
  headerCount: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: BrandColors.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  netto: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
    marginTop: 6,
  },
});
