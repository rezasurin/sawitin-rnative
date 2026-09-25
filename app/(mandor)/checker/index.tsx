import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { CheckerCard } from '@/components/bkm/CheckerCard';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerInfinite } from '@/hooks/useBkmChecker';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';

export default function CheckerListScreen() {
  const policy = useOperationalPolicy('bkmChecker');
  const group = useModuleGroup('(mandor)');
  const { status } = useLocalSearchParams<{ status?: string }>();

  const queryParams = useMemo(() => {
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    return {
      sort: 'created_at:desc',
      filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
    };
  }, [status]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBkmCheckerInfinite(queryParams);

  const handleCreate = () => {
    router.push(`/${group}/checker/add` as any);
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const checkerList = data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = data?.pages[0]?.pagination?.total ?? 0;

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Checker" />
      <FlatList
        data={checkerList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CheckerCard
            item={item}
            onPress={() => router.push(`/${group}/checker/${item.id}` as any)}
          />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
              {totalItems > 0 ? totalItems : checkerList.length} dokumen checker
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
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="clipboard-outline"
            emptyText="Belum ada data BKM Checker"
            emptySubtext="Tap + untuk membuat baru"
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

      {policy.create && <FAB onPress={handleCreate} />}
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
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
