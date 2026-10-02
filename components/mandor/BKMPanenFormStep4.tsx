import { Text, View } from '@/components/Themed';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { Button } from '@/components/core/Button';
import { BrandColors } from '@/constants/Colors';
import { useSubmitBkmPanen } from '@/hooks/useBkmPanen';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { blokApi, lahanApi, grupPekerjaApi, pekerjaApi, tphApi } from '@/services';
import { memberLabel } from '@/utils/plantation';
import { tbmReasonMissing } from '@/utils/maturity';
import { useBkmPanenStore } from '@/stores/useBkmPanenStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export function BKMPanenFormStep4({ onBack, onSuccess }: Props) {
  const { header, details, isEditing, editingId, editingModifiedAt, deletedDetailIds, reset } = useBkmPanenStore();
  const policy = useOperationalPolicy('bkmPanen', 'DRAFT', details.length);
  const submitMutation = useSubmitBkmPanen();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch name lookups
  const { data: blokData } = useQuery({ queryKey: ['blok', 'all'], queryFn: () => blokApi.getAll({ limit: 200 }) });
  const { data: lahanData } = useQuery({ queryKey: ['lahan', 'all'], queryFn: () => lahanApi.getAll({ limit: 200 }) });
  const { data: grupData } = useQuery({ queryKey: ['grupPekerja', 'all'], queryFn: () => grupPekerjaApi.getAll({ limit: 200 }) });
  const { data: pekerjaData } = useQuery({ queryKey: ['pekerja', 'all'], queryFn: () => pekerjaApi.getAll({ limit: 200 }) });
  const { data: tphData } = useQuery({ queryKey: ['tph', 'all'], queryFn: () => tphApi.getAll({ limit: 200 }) });
  const { data: orgConfig } = useOrgConfig();
  const bjr = orgConfig?.bjr ?? 15;

  const blokName = useMemo(() => blokData?.data?.find((b) => b.id === header.blok_id)?.nama ?? header.blok_id, [blokData, header.blok_id]);
  const lahanName = useMemo(() => lahanData?.data?.find((l) => l.id === header.lahan_id)?.nama ?? header.lahan_id, [lahanData, header.lahan_id]);
  const grupName = useMemo(() => grupData?.data?.find((g) => g.id === header.grup_pekerja_id)?.nama ?? header.grup_pekerja_id, [grupData, header.grup_pekerja_id]);
  const pekerjaMap = useMemo(() => {
    const map = new Map<string, string>();
    (pekerjaData?.data ?? []).forEach((p) => map.set(p.id, memberLabel(p.member, p.id)));
    return map;
  }, [pekerjaData]);
  const tphMap = useMemo(() => {
    const map = new Map<string, string>();
    (tphData?.data ?? []).forEach((t) => map.set(t.id, t.nama));
    return map;
  }, [tphData]);

  const totalJanjang = details.reduce(
    (sum, d) =>
      sum +
      (Number(d.janjang_normal) || 0) +
      (Number(d.buah_mentah) || 0) +
      (Number(d.over_ripe) || 0) +
      (Number(d.tangkai_panjang) || 0) +
      (Number(d.buah_abnormal) || 0) +
      (Number(d.janjang_kosong) || 0),
    0,
  );

  const totalBrondol = details.reduce(
    (sum, d) => sum + (Number(d.jumlah_brondol) || 0),
    0,
  );
  const hasBrondol = details.some((d) => d.jumlah_brondol != null);

  const estimatedTons = (totalJanjang * bjr) / 1000;

  const handleSubmit = async () => {
    if (!confirmed || (isEditing ? !policy.edit : !policy.create)) return;

    // The server answers 400 for this, so a queued item would only dead-letter:
    // stop it here, online or not.
    if (tbmReasonMissing({
      lahan: lahanData?.data?.find((l) => l.id === header.lahan_id),
      blok: blokData?.data?.find((b) => b.id === header.blok_id),
      day: header.tanggal_laporan,
      alasan: header.alasan_tbm,
    })) {
      Alert.alert('Alasan panen TBM wajib', 'Lahan ini TBM pada tanggal laporan. Kembali ke langkah 1 dan isi alasan panen.');
      return;
    }

    const headerPayload = {
      blok_id: header.blok_id!,
      lahan_id: header.lahan_id || undefined,
      tanggal_laporan: header.tanggal_laporan,
      keterangan: header.keterangan || undefined,
      grup_pekerja_id: header.grup_pekerja_id || undefined,
      alasan_tbm: header.alasan_tbm?.trim() || undefined,
    };

    const detailPayloads = details.map((d) => ({
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
      jumlah_brondol: d.jumlah_brondol,
      foto_url: d.foto_url ?? undefined,
      lat: d.lat ?? undefined,
      lng: d.lng ?? undefined,
      gps_accuracy: d.gps_accuracy ?? undefined,
      captured_at: d.captured_at ?? undefined,
      note: d.note ?? undefined,
    }));

    // Offline: queue for later sync
    if (!isOnline) {
      try {
      if (isEditing && editingId) {
        const detailPayloadsWithServerId = details.map((d) => ({
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
          jumlah_brondol: d.jumlah_brondol,
          foto_url: d.foto_url ?? undefined,
          lat: d.lat ?? undefined,
          lng: d.lng ?? undefined,
          gps_accuracy: d.gps_accuracy ?? undefined,
          captured_at: d.captured_at ?? undefined,
          note: d.note ?? undefined,
          serverId: d.serverId,
        }));

        await addToQueue({
          module: 'bkm_panen',
          action: 'UPDATE',
          endpoint: `/bkmPanen/${editingId}`,
          payload: {
            id: editingId,
            documentId: editingId,
            expectedStatus: 'DRAFT',
            header: headerPayload,
            details: detailPayloadsWithServerId,
            deletedDetailIds,
          },
          // What this edit was based on. Days may pass before it is sent, and
          // without this it would silently overwrite anything changed since.
          precondition: editingModifiedAt,
        });
      } else {
        await addToQueue({
          module: 'bkm_panen',
          action: 'CREATE',
          endpoint: '/bkmPanen',
          payload: { header: headerPayload, details: detailPayloads, submit: policy.submit },
        });
      }
      reset();
      Alert.alert(
        'Antrian Offline',
        'Data tersimpan dan akan dikirim saat online.',
        [{ text: 'OK', onPress: onSuccess }],
      );
      } catch (error) {
        Alert.alert('Gagal Menyimpan', error instanceof Error ? error.message : 'Antrian offline gagal disimpan.');
      }
      return;
    }

    // Online: submit directly (hook reads payload from store)
    submitMutation.mutate(undefined, {
      onSuccess: () => {
        reset();
        onSuccess();
      },
      onError: (err) => {
        Alert.alert(
          'Gagal Menyimpan',
          err instanceof Error ? err.message : 'Terjadi kesalahan',
        );
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Ringkasan Header</Text>
        <View style={styles.card}>
          <Row label="Blok" value={blokName} />
          {header.lahan_id ? (
            <Row label="Lahan" value={lahanName ?? ''} />
          ) : null}
          <Row label="Tanggal" value={header.tanggal_laporan} />
          {header.grup_pekerja_id ? (
            <Row label="Grup" value={grupName ?? ''} />
          ) : null}
          {header.keterangan ? (
            <Row label="Keterangan" value={header.keterangan} />
          ) : null}
          {header.alasan_tbm ? (
            <Row label="Alasan TBM" value={header.alasan_tbm} />
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Ringkasan Produksi</Text>
        <View style={styles.grid}>
          <MetricCard
            label="Detail"
            value={String(details.length)}
          />
          <MetricCard
            label="Total Janjang"
            value={String(totalJanjang)}
          />
          <MetricCard
            label="Brondol (kg)"
            value={hasBrondol ? `${totalBrondol} kg` : '—'}
          />
          <MetricCard
            label="Estimasi Tonase"
            value={`${estimatedTons.toFixed(2)} t`}
          />
          <MetricCard
            label="TPH"
            value={String(new Set(details.map((d) => d.tph_id)).size)}
          />
        </View>

        <Text style={styles.sectionTitle}>Detail per Pekerja</Text>
        {details.map((d) => (
          <View key={d._tempId} style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>
              {pekerjaMap.get(d.pekerja_id) ?? d.pekerja_id} — TPH: {tphMap.get(d.tph_id) ?? d.tph_id}
            </Text>
            <Text style={styles.detailCardValue}>
              Normal: {d.janjang_normal} | Mentah: {d.buah_mentah} | Over:{' '}
              {d.over_ripe} | T.Panjang: {d.tangkai_panjang}
            </Text>
            <Text style={styles.detailCardValue}>
              Abnormal: {d.buah_abnormal} | Kosong: {d.janjang_kosong} |
              Brondol (kg): {d.jumlah_brondol ?? '—'}
            </Text>
            {d.note ? (
              <Text style={styles.detailCardNote}>Catatan: {d.note}</Text>
            ) : null}
          </View>
        ))}

        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              confirmed && styles.checkboxChecked,
            ]}
          >
            {confirmed && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.confirmText}>
            Saya mengkonfirmasi data yang diinput sudah benar
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.navButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>Edit Data</Text>
        </TouchableOpacity>

        <Button
          title={policy.submit ? 'Submit BKM' : 'Simpan draft'}
          onPress={handleSubmit}
          variant="primary"
          disabled={!confirmed}
          loading={submitMutation.isPending}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyles.card}>
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  label: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  detailCardValue: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  detailCardNote: {
    fontSize: 12,
    color: BrandColors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 12,
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BrandColors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  checkmark: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: BrandColors.inputBorder,
  },
  editButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: BrandColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
