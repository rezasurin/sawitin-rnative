import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput, RefreshControl, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import { PageHeader } from '@/components/home';
import { FAB } from '@/components/core/FAB';
import { useBkmRawatList, useCreateBkmRawat, useDeleteBkmRawat } from '@/hooks/useBkmRawat';
import { useLahanList } from '@/hooks/useLahan';
import { useBlokList } from '@/hooks/useBlok';
import { useKelompokLahanList } from '@/hooks/useKelompokLahan';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: BrandColors.textMuted,
  SUBMITTED: '#E67E22',
  APPROVED: BrandColors.success,
  REVISION_REQUESTED: BrandColors.error,
  CANCELLED: BrandColors.textMuted,
};

export default function RawatScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  
  // List queries
  const { data: rawatList, isLoading, isError, refetch, isRefetching } = useBkmRawatList({ limit: 50 });
  const { data: lahanList } = useLahanList({ limit: 100 });
  const { data: blokList } = useBlokList({ limit: 100 });
  const { data: kelompokLahanList } = useKelompokLahanList({ limit: 100 });

  // Mutations
  const createMutation = useCreateBkmRawat();
  const deleteMutation = useDeleteBkmRawat();

  // Form states
  const [kelompokLahanId, setKelompokLahanId] = useState('');
  const [lahanId, setLahanId] = useState('');
  const [blokId, setBlokId] = useState('');
  const [namaPengawas, setNamaPengawas] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // Form active dropdown toggle (simple custom select sheets)
  const [activeDropdown, setActiveDropdown] = useState<'lahan' | 'grup' | 'blok' | null>(null);

  const handleResetForm = () => {
    setKelompokLahanId('');
    setLahanId('');
    setBlokId('');
    setNamaPengawas('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setModalVisible(false);
    setActiveDropdown(null);
  };

  const handleCreateRawat = () => {
    if (!kelompokLahanId || !lahanId || !namaPengawas || !tanggal) {
      Alert.alert('Form Belum Lengkap', 'Silakan isi kelompok lahan, lahan, tanggal, dan nama pengawas.');
      return;
    }

    const payload = {
      kelompok_lahan_id: kelompokLahanId,
      lahan_id: lahanId,
      blok_id: blokId || undefined,
      tanggal: new Date(tanggal).toISOString(),
      nama_pengawas: namaPengawas,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Berhasil', 'Dokumen BKM Rawat berhasil dibuat.');
        refetch();
        handleResetForm();
      },
      onError: (err) => {
        Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan BKM Rawat.');
      },
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Dokumen?', 'Apakah Anda yakin ingin menghapus dokumen rawat ini?', [
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
          });
        },
      },
    ]);
  };

  // Find selected labels for UI displays
  const selectedLahan = lahanList?.data.find((l) => l.id === lahanId);
  const selectedGrup = kelompokLahanList?.data.find((g) => g.id === kelompokLahanId);
  const selectedBlok = blokList?.data.find((b) => b.id === blokId);

  return (
    <View style={styles.container}>
      <PageHeader title="BKM Rawat" showMenuButton={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
      >
        <View style={styles.listHeader}>
          <Text style={styles.headerSubtitle}>
            {rawatList?.pagination?.total ?? 0} dokumen perawatan kebun
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centerContent}>
            <Ionicons name="cloud-offline" size={48} color={BrandColors.textMuted} />
            <Text style={styles.emptyText}>Gagal memuat data BKM Rawat</Text>
          </View>
        ) : rawatList?.data && rawatList.data.length > 0 ? (
          rawatList.data.map((item) => {
            const statusColor = STATUS_COLORS[item.status] ?? BrandColors.textMuted;
            const itemDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onLongPress={() => item.status === 'DRAFT' && handleDelete(item.id)}
                delayLongPress={600}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardTitle}>
                      {item.lahan?.nama || 'Lahan Bebas'}
                    </Text>
                    <Text style={styles.cardDate}>{itemDate} · {item.nama_pengawas}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={styles.cardMeta}>
                    Kelompok: {item.kelompok_lahan?.nama || '-'}
                  </Text>
                  {item.blok?.nama && (
                    <Text style={styles.cardMeta}>Blok: {item.blok.nama}</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.centerContent}>
            <Ionicons name="medkit-outline" size={54} color={BrandColors.textMuted} />
            <Text style={styles.emptyText}>Belum ada data BKM Rawat</Text>
            <Text style={styles.emptySubtext}>Tekan tombol + untuk menambah log perawatan</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB to Open Creator Modal */}
      <FAB onPress={() => setModalVisible(true)} />

      {/* Slide-Up Custom Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleResetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat BKM Rawat</Text>
              <Pressable onPress={handleResetForm} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={BrandColors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} contentContainerStyle={styles.formScroll}>
              {/* Form Input 1: Kelompok Lahan Dropdown */}
              <Text style={styles.formLabel}>Kelompok Lahan</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setActiveDropdown(activeDropdown === 'grup' ? null : 'grup')}
              >
                <Text style={[styles.dropdownValue, !kelompokLahanId && styles.placeholderText]}>
                  {selectedGrup?.nama || 'Pilih kelompok lahan kebun'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={BrandColors.textSecondary} />
              </Pressable>
              {activeDropdown === 'grup' && (
                <View style={styles.dropdownOptionsContainer}>
                  {kelompokLahanList?.data.map((g) => (
                    <Pressable
                      key={g.id}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setKelompokLahanId(g.id);
                        setActiveDropdown(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{g.nama}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Form Input 2: Lahan Dropdown */}
              <Text style={styles.formLabel}>Lahan (Field)</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setActiveDropdown(activeDropdown === 'lahan' ? null : 'lahan')}
              >
                <Text style={[styles.dropdownValue, !lahanId && styles.placeholderText]}>
                  {selectedLahan?.nama || 'Pilih lahan perkebunan'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={BrandColors.textSecondary} />
              </Pressable>
              {activeDropdown === 'lahan' && (
                <View style={styles.dropdownOptionsContainer}>
                  {lahanList?.data.map((l) => (
                    <Pressable
                      key={l.id}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setLahanId(l.id);
                        setActiveDropdown(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{l.nama}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Form Input 3: Blok Dropdown (Optional) */}
              <Text style={styles.formLabel}>Blok Kebun (Opsional)</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setActiveDropdown(activeDropdown === 'blok' ? null : 'blok')}
              >
                <Text style={[styles.dropdownValue, !blokId && styles.placeholderText]}>
                  {selectedBlok?.nama || 'Pilih blok (opsional)'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={BrandColors.textSecondary} />
              </Pressable>
              {activeDropdown === 'blok' && (
                <View style={styles.dropdownOptionsContainer}>
                  <Pressable
                    style={styles.dropdownOption}
                    onPress={() => {
                      setBlokId('');
                      setActiveDropdown(null);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: BrandColors.textMuted }]}>
                      Kosongkan blok
                    </Text>
                  </Pressable>
                  {blokList?.data.map((b) => (
                    <Pressable
                      key={b.id}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setBlokId(b.id);
                        setActiveDropdown(null);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{b.nama}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Form Input 4: Tanggal */}
              <Text style={styles.formLabel}>Tanggal Pelaksanaan</Text>
              <TextInput
                style={styles.textInput}
                value={tanggal}
                onChangeText={setTanggal}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={BrandColors.textMuted}
              />

              {/* Form Input 5: Nama Pengawas */}
              <Text style={styles.formLabel}>Nama Pengawas</Text>
              <TextInput
                style={styles.textInput}
                value={namaPengawas}
                onChangeText={setNamaPengawas}
                placeholder="Masukkan nama pengawas lapangan"
                placeholderTextColor={BrandColors.textMuted}
              />

              {/* Submit Action */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  createMutation.isPending && styles.submitBtnDisabled,
                ]}
                onPress={handleCreateRawat}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={BrandColors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Buat BKM Rawat</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  listHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.inputBorder,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: BrandColors.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: BrandColors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  cardDate: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    marginTop: 12,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 16,
  },
  cardMeta: {
    fontSize: 12,
    color: BrandColors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  formScroll: {
    paddingBottom: 60,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  dropdownValue: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  placeholderText: {
    color: BrandColors.textMuted,
  },
  dropdownOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F6F6',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: BrandColors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    backgroundColor: BrandColors.primary,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitBtnPressed: {
    backgroundColor: BrandColors.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: BrandColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
