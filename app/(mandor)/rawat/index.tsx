import { FAB } from '@/components/core/FAB';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
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
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import type { BkmRawat, QueuedBkmRawatPayload } from '@/types/bkm-rawat';
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
  const policy = useOperationalPolicy('bkmRawat', 'DRAFT');
  const canDelete = policy.delete;
  const canCreate = policy.create;
  const isOnline = useNetworkStore((state) => state.isOnline);
  const queue = useSyncQueueStore((state) => state.queue);
  const addToQueue = useSyncQueueStore((state) => state.addToQueue);
  const removeFromQueue = useSyncQueueStore((state) => state.removeFromQueue);
  const {
    data: rawatList,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useBkmRawatList({ limit: 50 });
  const deleteMutation = useDeleteBkmRawat();

  const queuedDeletes = new Set(queue.filter((item) => item.module === 'bkm_rawat' && item.action === 'DELETE').map((item) => (item.payload as { id?: string } | null)?.id).filter(Boolean));
  const localRawat = queue.filter((item) => item.module === 'bkm_rawat' && item.action === 'CREATE').flatMap((item) => {
    const payload = item.payload as unknown as QueuedBkmRawatPayload | null;
    if (!payload) return [];
    return [{
      id: `local:${item.id}`,
      org_id: 'local',
      ...payload.header,
      lahan_id: payload.header.lahan_id ?? null,
      status: payload.submit ? 'SUBMITTED' : 'DRAFT',
      approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, rejection_note: null,
      created_at: new Date(item.createdAt).toISOString(), created_by: 'local', modified_at: new Date(item.createdAt).toISOString(), modified_by: null,
      kelompok_lahan: { id: payload.header.kelompok_lahan_id, nama: payload.display?.kelompok_lahan_nama ?? payload.header.kelompok_lahan_id },
      blok: { id: payload.header.blok_id, nama: payload.display?.blok_nama ?? payload.header.blok_id },
      lahan: payload.header.lahan_id ? { id: payload.header.lahan_id, nama: payload.display?.lahan_nama ?? payload.header.lahan_id } : undefined,
    } as BkmRawat];
  });
  const rawatData = [...localRawat, ...(rawatList?.data ?? []).filter((item) => !queuedDeletes.has(item.id))];
  const totalItems = Math.max(0, (rawatList?.pagination?.total ?? 0) + localRawat.length - queuedDeletes.size);
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
          onPress: async () => {
            if (id.startsWith('local:')) {
              await removeFromQueue(id.slice('local:'.length));
              Alert.alert('Berhasil', 'Draft offline berhasil dihapus.');
              return;
            }
            if (!isOnline) {
              try {
                await addToQueue({
                  module: 'bkm_rawat',
                  action: 'DELETE',
                  endpoint: `/bkmRawat/${id}`,
                  payload: { id },
                });
                Alert.alert('Disimpan offline', 'Penghapusan akan dikirim saat koneksi tersedia.');
              } catch (error) {
                Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menyimpan penghapusan offline.');
              }
              return;
            }
            deleteMutation.mutate(id, {
              onSuccess: () => {
                Alert.alert('Berhasil', 'Dokumen berhasil dihapus.', [{ text: 'Tutup' }, { text: 'Lihat riwayat', onPress: () => router.push(`/${group}/rawat/${id}` as never) }]);
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
                onPress={() => router.push(`/${group}/rawat/${item.id}` as never)}
                onLongPress={() =>
                  canDelete && item.status === 'DRAFT' && handleDelete(item.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`BKM Rawat ${item.nama_pengawas}, ${item.status}`}
                accessibilityHint="Buka detail dokumen"
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
                    Kebun: {item.kelompok_lahan?.nama || '—'}
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
              {totalItems} dokumen perawatan kebun
            </Text>
            {hasDraft && canDelete && (
              <Text style={styles.headerHint}>
                Tekan lama untuk menghapus DRAFT
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError && rawatData.length === 0}
            isEmpty={!isLoading && rawatData.length === 0}
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
      {canCreate && <FAB onPress={() => router.push(`/${group}/rawat/add`)} />}
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
