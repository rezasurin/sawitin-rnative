import { FAB } from '@/components/core/FAB';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerList } from '@/hooks/useBkmChecker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: BrandColors.textMuted,
  SUBMITTED: '#E67E22',
  APPROVED: BrandColors.success,
  REVISION_REQUESTED: BrandColors.error,
  CANCELLED: BrandColors.textMuted,
};

export default function CheckerListScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useBkmCheckerList({
    limit: 50,
    page: 1,
  });

  const handleCreate = () => {
    router.push('/(mandor)/checker/add' as any);
  };

  const totalItems = data?.pagination?.total ?? 0;

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Checker" />
      <View style={styles.listHeader}>
        <Text style={styles.headerSubtitle}>
          {totalItems} dokumen checker
        </Text>
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline" size={48} color={BrandColors.textMuted} />
              <Text style={styles.emptyText}>Gagal memuat data</Text>
              <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color={BrandColors.textMuted} />
              <Text style={styles.emptyText}>Belum ada data BKM Checker</Text>
              <Text style={styles.emptySubtext}>Tap + untuk membuat baru</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] ?? BrandColors.textMuted;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(mandor)/checker/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>
                    {item.blok?.nama ?? 'Blok tidak diketahui'}
                  </Text>
                  <Text style={styles.cardDate}>{item.tanggal_laporan}</Text>
                  <Text style={styles.cardMeta}>
                    TPH: {item.tph?.nama ?? '-'} · Detail: {item.details?.length ?? 0}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <FAB onPress={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: BrandColors.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BrandColors.primary,
    borderRadius: 4,
  },
  retryText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  cardDate: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
