import { Badge } from '@/components/core/Badge';
import { Card } from '@/components/core/Card';
import { FAB } from '@/components/core/FAB';
import { ListEmptyState } from '@/components/core/ListEmptyState';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useMaterialList, useDeleteMaterial } from '@/hooks/useMaterial';
import type { Material, GlobalStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/core/Button';
import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

const STATUS_CONFIG: Record<GlobalStatus, { color: string; bg: string; label: string }> = {
  ACTIVE: { color: BrandColors.success, bg: '#E8F5E9', label: 'Aktif' },
  INACTIVE: { color: BrandColors.textMuted, bg: '#F0F0F0', label: 'Nonaktif' },
};

function StatusBadge({ status }: { status: GlobalStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE;
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
}

function MaterialCard({
  item,
  onPress,
  onDelete,
  canDelete,
}: {
  item: Material;
  onPress: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <Card>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cube" size={18} color={BrandColors.primary} />
            <Text style={styles.cardTitle}>{item.nama}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMeta}>Kode: {item.kode}</Text>
          <Text style={styles.cardMeta}>Kategori: {item.kategori}</Text>
          <Text style={styles.cardMeta}>Satuan: {item.satuan}</Text>
          {!!item.bahan_aktif && <Text style={styles.cardMeta}>Bahan aktif: {item.bahan_aktif}</Text>}
          {!!item.konsentrasi && <Text style={styles.cardMeta}>Konsentrasi: {item.konsentrasi}</Text>}
          {item.harga_satuan !== null && (
            <Text style={styles.cardMeta}>
              Harga: Rp {item.harga_satuan.toLocaleString('id-ID')}
            </Text>
          )}
          {item.stok !== null && (
            <Text style={styles.cardMeta}>Stok: {item.stok}</Text>
          )}
        </View>
      </TouchableOpacity>
      {canDelete && <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
      </TouchableOpacity>}
    </Card>
  );
}

export default function MaterialScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useMaterialList();
  const deleteMutation = useDeleteMaterial();
  const canWrite = useAuthStore((state) => state.hasPermission('mod_material', 'write'));
  const canUpdate = useAuthStore((state) => state.hasPermission('mod_material', 'update'));
  const canDelete = useAuthStore((state) => state.hasPermission('mod_material', 'delete'));

  const materialList = data?.data ?? [];

  const handleCardPress = React.useCallback(
    (id: string) => {
      router.push(`/(admin)/material/add?id=${id}` as any);
    },
    [router]
  );

  const handleDelete = React.useCallback(
    (item: Material) => {
      Alert.alert(
        'Hapus Material',
        `Yakin ingin menghapus "${item.nama}"?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              await deleteMutation.mutateAsync(item.id);
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  return (
    <View style={styles.container}>
      <PageHeader title="Material" />
      <FlatList
        data={materialList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MaterialCard
            item={item}
            onPress={() => canUpdate && handleCardPress(item.id)}
            onDelete={() => canDelete && handleDelete(item)}
            canDelete={canDelete}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <ListEmptyState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError}
            onRetry={() => refetch()}
            emptyIcon="cube-outline"
            emptyText="Belum ada data material"
            emptySubtext="Tambahkan material baru dengan menekan tombol +"
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

      <Button title="Lihat stok opname" variant="secondary" onPress={() => router.push('/(admin)/stock-opname' as never)} />
      {canWrite && <FAB onPress={() => router.push('/(admin)/material/add')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  listContent: { paddingBottom: 120 },
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
  cardMeta: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
});
