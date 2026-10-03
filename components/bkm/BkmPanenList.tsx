import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

interface BkmPanenListProps {
  onCardPress: (id: string) => void;
  onCreatePress?: () => void;
  emptyHint?: string;
  initialStatus?: string | null;
  onStatusChange?: (status: string | null) => void;
}

/**
 * Shared BKM Panen list screen for both Mandor (operator) and Asisten (reviewer).
 * Role differences are expressed via props only:
 *  - onCreatePress renders the FAB (mandor creates, asisten reviews)
 *  - long-press delete of DRAFT is mandor-only (asisten has no delete permission)
 */
export function BkmPanenList({ onCardPress, onCreatePress, emptyHint, initialStatus = null, onStatusChange }: BkmPanenListProps) {
  const policy = useOperationalPolicy('bkmPanen', 'DRAFT');
  const [showFilter, setShowFilter] = useState(false);
  const [filterState, setFilterState] = useState<FilterSortState>({
    sort: 'tanggal_laporan:desc',
    status: initialStatus,
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

  // Dashboard links must update the filter even when this tab is already mounted.
  useEffect(() => {
    setFilterState((current) => ({ ...current, status: initialStatus }));
  }, [initialStatus]);

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

  const handleLongPress = useCallback(
    (item: BkmPanen) => {
      if (item.status !== 'DRAFT' || !policy.delete) return;

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
            deleteMutation.mutate(item.id, { onSuccess: () => Alert.alert('Draft dihapus', 'Riwayat tetap tersedia.', [{ text: 'Tutup' }, { text: 'Lihat riwayat', onPress: () => onCardPress(item.id) }]) });
          },
        },
      ]);
    },
    [isOnline, deleteMutation, addToQueue, policy.delete, onCardPress],
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
            onPress={() => onCardPress(item.id)}
            onLongPress={policy.delete ? () => handleLongPress(item) : undefined}
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
                {hasDraft && policy.delete && (
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
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="document-text-outline"
            emptyText="Belum ada data BKM Panen"
            emptySubtext={emptyHint}
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

      {onCreatePress && policy.create && <FAB onPress={onCreatePress} />}

      <FilterSortSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        initialState={filterState}
        onApply={(next) => {
          setFilterState(next);
          onStatusChange?.(next.status);
        }}
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
});
