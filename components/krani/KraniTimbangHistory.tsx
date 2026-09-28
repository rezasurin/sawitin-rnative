import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useKraniTimbangList } from '@/hooks/useKraniTimbang';
import type { KraniTimbang } from '@/types';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { estateDate } from '@/utils/estateDate';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

interface KraniTimbangHistoryProps {
  onCardPress: (id: string) => void;
  onScanPress: () => void;
}

export function KraniTimbangHistory({ onCardPress, onScanPress }: KraniTimbangHistoryProps) {
  const policy = useOperationalPolicy('kraniTimbang');
  const { data, isLoading, isError, refetch, isRefetching } = useKraniTimbangList({
    page: 1,
    limit: 100,
    sort: 'created_at:desc',
  });

  const allItems = data?.data ?? [];
  // `tanggal` is a DateTime, so compare estate (WIB) calendar days, not raw strings.
  const today = estateDate();
  const items = allItems.filter((i) => estateDate(new Date(i.tanggal)) === today);

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
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={styles.headerCount}>{items.length} penimbangan hari ini</Text>
          ) : null
        }
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="time-outline"
            emptyText="Belum ada timbangan hari ini"
            emptySubtext="Pindai QR SPB untuk mulai penimbangan"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[BrandColors.primary]}
          />
        }
      />

      {policy.create && <FAB label="Pindai QR untuk timbangan baru" onPress={onScanPress} />}
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
