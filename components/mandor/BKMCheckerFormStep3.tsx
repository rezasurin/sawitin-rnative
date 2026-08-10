import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useSubmitBkmChecker } from '@/hooks/useBkmChecker';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { blokApi, tphApi } from '@/services';
import { bkmPanenApi } from '@/services/bkm-panen.service';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const DISCREPANCY_TOLERANCE_PCT = 2;

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export function BKMCheckerFormStep3({ onBack, onSuccess }: Props) {
  const { header, details, reset } = useBkmCheckerStore();
  const submitMutation = useSubmitBkmChecker();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const addToQueue = useSyncQueueStore((s) => s.addToQueue);
  const [confirmed, setConfirmed] = useState(false);

  const { data: blokData } = useQuery({ queryKey: ['blok', 'all'], queryFn: () => blokApi.getAll({ limit: 200 }) });
  const { data: tphData } = useQuery({ queryKey: ['tph', 'all'], queryFn: () => tphApi.getAll({ limit: 200 }) });

  const { data: orgConfig } = useOrgConfig();
  const bjr = orgConfig?.bjr ?? 15;

  const { data: linkedPanen } = useQuery({
    queryKey: ['bkmPanen', 'byId', header.bkm_panen_id],
    queryFn: () => bkmPanenApi.getById(header.bkm_panen_id!),
    enabled: !!header.bkm_panen_id,
  });

  const blokName = useMemo(() => blokData?.data?.find((b) => b.id === header.blok_id)?.nama ?? header.blok_id, [blokData, header.blok_id]);
  const tphName = useMemo(() => tphData?.data?.find((t) => t.id === header.tph_id)?.nama ?? header.tph_id, [tphData, header.tph_id]);

  const totalJanjang = details.reduce((sum, d) => sum + d.jumlah_janjang, 0);
  const totalBrondol = details.reduce((sum, d) => sum + d.jumlah_brondol, 0);

  const panenJanjangForTph =
    linkedPanen?.details
      ?.filter((pd) => pd.tph_id === header.tph_id)
      .reduce((sum, pd) => sum + pd.jumlah_janjang, 0) ?? 0;

  const discrepancyPct =
    panenJanjangForTph > 0
      ? (Math.abs(totalJanjang - panenJanjangForTph) / panenJanjangForTph) * 100
      : totalJanjang > 0
        ? 100
        : 0;

  const mismatchExceedsTolerance =
    !!header.bkm_panen_id &&
    (panenJanjangForTph > 0 ? discrepancyPct > DISCREPANCY_TOLERANCE_PCT : totalJanjang > 0);
  const estimatedTons = (totalJanjang * bjr) / 1000;

  const handleSubmit = () => {
    if (!confirmed) return;

    if (mismatchExceedsTolerance) {
      Alert.alert(
        'Tidak Sesuai BKM Panen',
        `Selisih ${discrepancyPct.toFixed(1)}% dari BKM Panen. Periksa kembali jumlah janjang sebelum submit.`
      );
      return;
    }

    const headerPayload = {
      blok_id: header.blok_id,
      tph_id: header.tph_id,
      lahan_id: header.lahan_id || '',
      tanggal_laporan: header.tanggal_laporan,
      keterangan: header.keterangan || undefined,
      bkm_panen_id: header.bkm_panen_id || undefined,
    };

    const detailPayloads = details.map((d) => ({
      tipe_pengiriman: d.tipe_pengiriman,
      nomor_truk: d.nomor_truk,
      nama_sopir: d.nama_sopir,
      tujuan_kirim: d.tujuan_kirim,
      janjang_normal: d.janjang_normal,
      buah_mentah: d.buah_mentah,
      over_ripe: d.over_ripe,
      tangkai_panjang: d.tangkai_panjang,
      buah_abnormal: d.buah_abnormal,
      janjang_kosong: d.janjang_kosong,
      jumlah_janjang: d.jumlah_janjang,
      jumlah_brondol: d.jumlah_brondol,
    }));

    if (!isOnline) {
      addToQueue({
        module: 'bkm_checker',
        action: 'CREATE',
        endpoint: '/bkmChecker',
        payload: { header: headerPayload, details: detailPayloads },
      });
      reset();
      Alert.alert(
        'Antrian Offline',
        'Data tersimpan dan akan dikirim saat online.',
        [{ text: 'OK', onPress: onSuccess }],
      );
      return;
    }

    submitMutation.mutate(
      { header: headerPayload, details: detailPayloads },
      {
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
      },
    );
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
          <Row label="TPH" value={tphName} />
          <Row label="Tanggal" value={header.tanggal_laporan} />
          {header.bkm_panen_id && <Row label="BKM Panen" value={header.bkm_panen_id} />}
          {header.keterangan && <Row label="Keterangan" value={header.keterangan} />}
        </View>

        <Text style={styles.sectionTitle}>Ringkasan Produksi</Text>
        <View style={styles.grid}>
          <MetricCard label="Detail" value={String(details.length)} />
          <MetricCard label="Total Janjang" value={String(totalJanjang)} />
          <MetricCard label="Brondolan" value={`${totalBrondol} kg`} />
        </View>

        {header.bkm_panen_id && linkedPanen && (
          <View
            style={[
              styles.warningCard,
              mismatchExceedsTolerance && styles.warningCardBad,
            ]}
          >
            <Text style={styles.warningText}>
              {mismatchExceedsTolerance
                ? `⚠️ Jumlah janjang tidak sesuai BKM Panen (selisih ${discrepancyPct.toFixed(1)}%). Checker: ${totalJanjang}, Panen: ${panenJanjangForTph}. Submit akan ditolak.`
                : `✓ Sesuai BKM Panen (selisih ${discrepancyPct.toFixed(1)}%)`}
            </Text>
            <Text style={styles.warningEstimate}>
              Estimasi Tonase: {estimatedTons.toFixed(2)} t ({bjr} kg/janjang)
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Detail per Truk</Text>
        {details.map((d) => (
          <View key={d._tempId} style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>
              {d.tipe_pengiriman} · Truk: {d.nomor_truk || '-'}
            </Text>
            <Text style={styles.detailCardValue}>
              Sopir: {d.nama_sopir || '-'} · Tujuan: {d.tujuan_kirim || '-'}
            </Text>
            <Text style={styles.detailCardValue}>
              Normal: {d.janjang_normal} | Mentah: {d.buah_mentah} | Over: {d.over_ripe} | T.Panjang: {d.tangkai_panjang}
            </Text>
            <Text style={styles.detailCardValue}>
              Abnormal: {d.buah_abnormal} | Kosong: {d.janjang_kosong} | Brondol: {d.jumlah_brondol} kg
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmText}>
            Saya mengkonfirmasi data yang diinput sudah benar
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.editButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.editButtonText}>Edit Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, (!confirmed || mismatchExceedsTolerance || submitMutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!confirmed || mismatchExceedsTolerance || submitMutation.isPending}
          activeOpacity={0.7}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={BrandColors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Checker</Text>
          )}
        </TouchableOpacity>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyles.card}>
      <Text style={metricStyles.value}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
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
  label: { fontSize: 14, color: BrandColors.textSecondary },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

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
  submitButton: {
    flex: 2,
    backgroundColor: BrandColors.button,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  warningCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningCardBad: {
    backgroundColor: '#FFF3E0',
    borderColor: '#E65100',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  warningEstimate: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  submitButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
