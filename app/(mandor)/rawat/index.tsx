import { FAB } from '@/components/core/FAB';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmRawatList, useDeleteBkmRawat } from '@/hooks/useBkmRawat';
import { DocStatusBadge } from '@/components/bkm/DocStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

export default function RawatScreen() {
  const router = useRouter();

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
            <TouchableOpacity
              style={styles.card}
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
              <Text style={styles.emptyText}>Belum ada data BKM Rawat</Text>
              <Text style={styles.emptySubtext}>
                Tambahkan dokumen rawat baru dengan menekan tombol +
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

      <FAB onPress={() => router.push('/(mandor)/rawat/add')} />
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