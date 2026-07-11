import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { PanenCard } from '@/components/bkm/PanenCard';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenInfinite } from '@/hooks/useBkmPanen';
import type { BkmPanen } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function BkmScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBkmPanenInfinite();

  const panenList = data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = data?.pages[0]?.pagination?.total ?? 0;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardPress = React.useCallback(
    (id: string) => {
      router.push(`/(asisten)/bkm/${id}` as any);
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Panen" />
      <FlatList
        data={panenList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PanenCard item={item} onPress={() => handleCardPress(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
              {totalItems > 0 ? totalItems : panenList.length} dokumen panen
            </Text>
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
              <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
              <Text style={styles.errorText}>Gagal memuat data</Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.retryText}>Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="document-text-outline" size={48} color={BrandColors.textMuted} />
              <Text style={styles.emptyText}>Belum ada data BKM Panen</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { paddingBottom: 120 },
  listHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: BrandColors.inputBorder },
  headerSubtitle: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 4 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: BrandColors.textMuted, fontSize: 15, marginTop: 12 },
  errorText: { color: BrandColors.error, fontSize: 15, marginTop: 12 },
  retryText: { color: BrandColors.primary, fontSize: 14, fontWeight: '600', marginTop: 8 },
});
