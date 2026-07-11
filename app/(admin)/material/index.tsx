import { FAB } from '@/components/core/FAB';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useMaterialList, useDeleteMaterial } from '@/hooks/useMaterial';
import type { Material, GlobalStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

function MaterialCard({
  item,
  onPress,
  onDelete,
}: {
  item: Material;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
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
        {item.harga_satuan !== null && (
          <Text style={styles.cardMeta}>
            Harga: Rp {item.harga_satuan.toLocaleString('id-ID')}
          </Text>
        )}
        {item.stok !== null && (
          <Text style={styles.cardMeta}>Stok: {item.stok}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function MaterialScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useMaterialList();
  const deleteMutation = useDeleteMaterial();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
              setDeletingId(item.id);
              try {
                await deleteMutation.mutateAsync(item.id);
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [deleteMutation]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={materialList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MaterialCard
            item={item}
            onPress={() => handleCardPress(item.id)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Material</Text>
            <Text style={styles.headerSubtitle}>
              {materialList.length} item material
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
                name="cube-outline"
                size={48}
                color={BrandColors.textMuted}
              />
              <Text style={styles.emptyText}>Belum ada data material</Text>
              <Text style={styles.emptySubtext}>
                Tambahkan material baru dengan menekan tombol +
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

      <FAB onPress={() => router.push('/(admin)/material/add')} />
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
