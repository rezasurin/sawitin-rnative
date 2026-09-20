import { FAB } from '@/components/core/FAB';
import { useRouter } from 'expo-router';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import { Card } from '@/components/core/Card';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmRawatList, useDeleteBkmRawat } from '@/hooks/useBkmRawat';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function RawatScreen() {
  const router = useRouter();
  const group = useModuleGroup('(mandor)');
  const {
    data: rawatList,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useBkmRawatList({ limit: 50 });
  const deleteMutation = useDeleteBkmRawat();

  const rawatData = rawatList?.data ?? [];
  const totalItems = rawatList?.pagination?.total ?? 0;
  const hasDraft = rawatData.some((item) => item.status === 'DRAFT');

  const handleDelete = (id: string) => {
    Alert.alert(
      'Hapus Dokumen?',
      'Apakah Anda yakin ingin menghapus dokumen rawat ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id, {
              onSuccess: () => {
                Alert.alert('Berhasil', 'Dokumen berhasil dihapus.');
                refetch();
              },
              onError: (err) => {
                Alert.alert(
                  'Gagal',
                  err instanceof Error
                    ? err.message
                    : 'Terjadi kesalahan saat menghapus dokumen.'
                );
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Rawat" />
      <FlatList
        data={rawatData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const itemDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          return (
            <Card>
              <TouchableOpacity
                onLongPress={() =>
                  item.status === 'DRAFT' && handleDelete(item.id)
                }
                delayLongPress={600}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardTitle}>
                      {item.lahan?.nama || 'Lahan Bebas'}
                    </Text>
                    <Text style={styles.cardDate}>
                      {itemDate} · {item.nama_pengawas}
                    </Text>
                  </View>
                  <DocStatusBadge status={item.status} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardMeta}>
                    Kelompok: {item.kelompok_lahan?.nama || '-'}
                  </Text>
                {item.blok?.nama && (
                  <Text style={styles.cardMeta}>
                    Blok: {item.blok.nama}
                  </Text>
                )}
              </View>
              </TouchableOpacity>
            </Card>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
              {totalItems > 0 ? totalItems : rawatData.length} dokumen perawatan kebun
            </Text>
            {hasDraft && (
              <Text style={styles.headerHint}>
                Tekan lama untuk menghapus DRAFT
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="document-text-outline"
            emptyText="Belum ada data BKM Rawat"
            emptySubtext="Tambahkan dokumen rawat baru dengan menekan tombol +"
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
      <FAB onPress={() => router.push(`/${group}/rawat/add`)} />
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
  headerHint: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderInfo: { flex: 1, marginRight: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  cardDate: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  cardBody: {},
  cardMeta: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
});