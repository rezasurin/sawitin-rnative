import { Text, View } from '@/components/Themed';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerDetail, useApproveBkmChecker } from '@/hooks/useBkmChecker';
import { useLocalSearchParams, router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useBkmCheckerStore } from '@/stores/useBkmCheckerStore';

export default function CheckerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmCheckerDetail(id);
  const approveMutation = useApproveBkmChecker();
  const buildQrPayload = useBkmCheckerStore((s) => s.buildQrPayload);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Gagal memuat data</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleApprove = () => {
    Alert.alert('Setujui Checker?', 'Data akan disetujui dan siap untuk ditimbang.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Setujui',
        onPress: () => {
          approveMutation.mutate(id, {
            onSuccess: () => {
              Alert.alert('Berhasil', 'BKM Checker telah disetujui.');
              refetch();
            },
            onError: (err) => {
              Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan');
            },
          });
        },
      },
    ]);
  };

  const canApprove = data.status === 'SUBMITTED';

  const totalJanjang = data.details?.reduce((acc, curr) => acc + curr.jumlah_janjang, 0) ?? 0;
  const timestamp = Date.parse(data.tanggal_laporan) || Date.now();
  const qrPayload = buildQrPayload(data.id, totalJanjang, timestamp);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Checker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Display QR code if APPROVED or SUBMITTED */}
        {(data.status === 'APPROVED' || data.status === 'SUBMITTED') && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>QR Code Surat Pengantar Buah (SPB)</Text>
            <Text style={styles.qrSubtitle}>Tunjukkan kode QR ini ke Krani Timbang di Mill Gate</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrPayload}
                size={180}
                color="black"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.qrPayloadText}>Signature: {data.id.slice(0, 6)}... · Qty: {totalJanjang}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Row label="Blok" value={data.blok?.nama ?? data.blok_id} />
          <Row label="TPH" value={data.tph?.nama ?? data.tph_id} />
          <Row label="Tanggal" value={data.tanggal_laporan} />
          <Row label="Status" value={data.status} />
          {data.bkm_panen_id && <Row label="BKM Panen" value={data.bkm_panen_id} />}
          {data.keterangan && <Row label="Keterangan" value={data.keterangan} />}
        </View>

        <Text style={styles.sectionTitle}>Detail ({data.details?.length ?? 0})</Text>
        {(data.details ?? []).map((d) => (
          <View key={d.id} style={styles.detailCard}>
            <Text style={styles.detailTitle}>
              {d.tipe_pengiriman} · Truk: {d.nomor_truk || '-'}
            </Text>
            <Text style={styles.detailValue}>
              Sopir: {d.nama_sopir || '-'} · Tujuan: {d.tujuan_kirim || '-'}
            </Text>
            <Text style={styles.detailValue}>
              Normal: {d.janjang_normal} | Mentah: {d.buah_mentah} | Over: {d.over_ripe} | Brondol: {d.jumlah_brondol} kg
            </Text>
            <Text style={styles.detailValue}>
              Total Janjang: {d.jumlah_janjang}
            </Text>
          </View>
        ))}

        {canApprove && (
          <TouchableOpacity
            style={styles.approveButton}
            onPress={handleApprove}
            disabled={approveMutation.isPending}
            activeOpacity={0.7}
          >
            {approveMutation.isPending ? (
              <ActivityIndicator color={BrandColors.white} />
            ) : (
              <Text style={styles.approveButtonText}>Setujui Checker</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: BrandColors.primary,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: BrandColors.white, fontSize: 14 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.white,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 14, color: BrandColors.textSecondary },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  detailValue: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  approveButton: {
    backgroundColor: BrandColors.success,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  approveButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.textMuted,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BrandColors.primary,
    borderRadius: 4,
  },
  retryText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  qrCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    marginBottom: 12,
  },
  qrPayloadText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    textAlign: 'center',
  },
});
