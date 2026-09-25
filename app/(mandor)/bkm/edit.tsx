import { BKMPanenForm } from '@/components/mandor/BKMPanenForm';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { Text } from 'react-native';
import { PageHeader } from '@/components/home';
import { View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmPanenDetail } from '@/hooks/useBkmPanen';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function EditBkmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: panen, isLoading } = useBkmPanenDetail(id ?? '');
  const policy = useOperationalPolicy('bkmPanen', panen?.status, panen?.details?.length);
  const startEditing = useBkmPanenStore((s) => s.startEditing);

  useEffect(() => {
    if (panen && id && policy.edit) {
      const header = {
        blok_id: panen.blok_id ?? '',
        lahan_id: panen.lahan_id ?? '',
        tanggal_laporan: panen.tanggal_laporan,
        keterangan: panen.keterangan ?? undefined,
        grup_pekerja_id: panen.grup_pekerja_id ?? undefined,
      };
      const details = (panen.details ?? []).map((d) => ({
        bkm_panen_id: d.bkm_panen_id,
        pekerja_id: d.pekerja_id,
        tph_id: d.tph_id,
        jenis_pekerjaan: d.jenis_pekerjaan,
        janjang_normal: d.janjang_normal,
        buah_mentah: d.buah_mentah,
        over_ripe: d.over_ripe,
        tangkai_panjang: d.tangkai_panjang,
        buah_abnormal: d.buah_abnormal,
        janjang_kosong: d.janjang_kosong,
        jumlah_janjang: d.jumlah_janjang,
        jumlah_brondol: d.jumlah_brondol ?? undefined,
        foto_url: d.foto_url ?? undefined,
        lat: d.lat ?? undefined,
        lng: d.lng ?? undefined,
        note: d.note ?? undefined,
        _tempId: d.id,
        serverId: d.id,
      }));
      // The baseline this edit is against; it rides with a queued update as
      // If-Unmodified-Since so a stale change is refused rather than applied.
      startEditing(id, header, details, panen.modified_at ?? null);
    }
  }, [panen, id, startEditing, policy.edit]);

  if (!id || isLoading || !panen) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Edit BKM"
          showBackButton
          onBack={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Edit BKM"
        showBackButton
        onBack={() => router.back()}
      />
      {policy.edit ? <BKMPanenForm onSuccess={() => router.back()} /> : <Text>Hanya dokumen DRAFT dengan izin ubah dapat diedit. Buka kembali dokumen revisi terlebih dahulu.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
