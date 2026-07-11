import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerList } from '@/hooks/useBkmChecker';
import type { BkmChecker, DocumentStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: '#F0F0F0', label: 'Draft' },
  SUBMITTED: { color: '#2196F3', bg: '#E3F2FD', label: 'Submitted' },
  APPROVED: { color: BrandColors.success, bg: '#E8F5E9', label: 'Approved' },
  REVISION_REQUESTED: { color: BrandColors.error, bg: '#FFEBEE', label: 'Revisi' },
  CANCELLED: { color: '#9E9E9E', bg: '#F5F5F5', label: 'Cancelled' },
};

function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

function CheckerCard({ item, onPress }: { item: BkmChecker; onPress: () => void }) {
  const firstDetail = item.details?.[0];
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
          <Text style={styles.cardTitle}>
            {item.blok?.nama ?? item.blok_id}
          </Text>
        </View>
        <DocStatusBadge status={item.status} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>{item.tanggal_laporan}</Text>
        {item.lahan?.nama && (
          <Text style={styles.cardMeta}>Lahan: {item.lahan.nama}</Text>
        )}
        {firstDetail?.nomor_truk && (
          <Text style={styles.cardMeta}>Truck: {firstDetail.nomor_truk}</Text>
        )}
        {firstDetail?.nama_sopir && (
          <Text style={styles.cardMeta}>Driver: {firstDetail.nama_sopir}</Text>
        )}
        <Text style={styles.cardDetailCount}>
          {item.details?.length ?? 0} detail
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CheckerListScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } =
    useBkmCheckerList();

  const checkerList = data?.data ?? [];

  const handleCardPress = React.useCallback(
    (id: string) => {
      router.push(`/(krani)/checker/${id}`);
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={checkerList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CheckerCard
            item={item}
            onPress={() => handleCardPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BKM Checker</Text>
            <Text style={styles.headerSubtitle}>
              {checkerList.length} dokumen checker
            </Text>
          </View>
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
              <Text style={styles.emptyText}>Belum ada data BKM Checker</Text>
              <Text style={styles.emptySubtext}>
                Dokumen checker akan muncul setelah Mandor menginput data
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { paddingBottom: 120 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
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