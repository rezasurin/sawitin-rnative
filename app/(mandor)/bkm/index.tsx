import { FAB } from '@/components/core/FAB';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenInfinite, useDeleteBkmPanen } from '@/hooks/useBkmPanen';
import type { BkmPanen } from '@/types';
import { PanenCard } from '@/components/bkm/PanenCard';
import { FilterSortSheet, type FilterSortState } from '@/components/bkm/FilterSortSheet';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function BkmScreen() {
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(false);
  const [filterState, setFilterState] = useState<FilterSortState>({
    sort: 'tanggal_laporan:desc',
    status: null,
    blok_id: null,
    lahan_id: null,
  });

  const queryParams = useMemo(() => {
    const filters: any = {};
    if (filterState.status) filters.status = filterState.status;
    if (filterState.blok_id) filters.blok_id = filterState.blok_id;
    if (filterState.lahan_id) filters.lahan_id = filterState.lahan_id;
    return {
      sort: filterState.sort,
      filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
    };
  }, [filterState]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBkmPanenInfinite(queryParams);
  const deleteMutation = useDeleteBkmPanen();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);

  const panenList = data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = data?.pages[0]?.pagination?.total ?? 0;
  const hasDraft = panenList.some((item) => item.status === 'DRAFT');

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardPress = React.useCallback(
    (id: string) => {
      router.push(`/(mandor)/bkm/${id}`);
    },
    [router],
  );

  const handleLongPress = React.useCallback(
    (item: BkmPanen) => {
      if (item.status !== 'DRAFT') return;

      Alert.alert('Hapus BKM Panen?', 'Data akan dihapus permanen.', [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            if (!isOnline) {
              addToQueue({
                module: 'bkm_panen',
                action: 'DELETE',
                endpoint: `/bkmPanen/${item.id}`,
                payload: { id: item.id },
              });
              Alert.alert(
                'Antrian Offline',
                'Dokumen akan dihapus saat terhubung ke internet.'
              );
              return;
            }
            deleteMutation.mutate(item.id);
          },
        },
      ]);
    },
    [isOnline, deleteMutation, addToQueue],
  );

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Panen" />
      <FlatList
        data={panenList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PanenCard
            item={item}
            onPress={() => handleCardPress(item.id)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerSubtitle}>
                  {totalItems > 0 ? totalItems : panenList.length} dokumen panen
                </Text>
                {hasDraft && (
                  <Text style={styles.headerHint}>
                    Tekan lama untuk menghapus DRAFT
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilter(true)}
              >
                <Ionicons name="filter" size={20} color={BrandColors.primary} />
                <Text style={styles.filterText}>Urut & Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={BrandColors.error}
              />
              <Text style={styles.errorText}>Gagal memuat data</Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.retryText}>Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={BrandColors.textMuted}
              />
              <Text style={styles.emptyText}>Belum ada data BKM Panen</Text>
              <Text style={styles.emptySubtext}>
                Tambahkan dokumen panen baru dengan menekan tombol +
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[BrandColors.primary]}
          />
        }
      />

      <FAB onPress={() => router.push('/(mandor)/bkm/add')} />

      <FilterSortSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        initialState={filterState}
        onApply={setFilterState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { paddingBottom: 120 },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F3EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  headerHint: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: BrandColors.textMuted,
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    color: BrandColors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    color: BrandColors.error,
    fontSize: 15,
    marginTop: 12,
  },
  retryText: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  cardBody: {},
  cardDate: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  cardMeta: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  cardDetailCount: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
});
