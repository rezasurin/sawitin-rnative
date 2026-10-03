import { Text, View } from '@/components/Themed';
import { OperationalActions } from '@/components/bkm/OperationalActions';
import { OperationalDraftEditor } from '@/components/bkm/OperationalDraftEditor';
import { OperationalHistory } from '@/components/bkm/OperationalHistory';
import { PageHeader } from '@/components/home';
import { BrandColors } from '@/constants/Colors';
import { useBkmCheckerDetail } from '@/hooks/useBkmChecker';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { bkmCheckerApi } from '@/services/bkm-checker.service';
import { isTrip } from '@/utils/trip';
import { useQuery } from '@tanstack/react-query';

export default function CheckerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmCheckerDetail(id);
  const spb = useQuery({
    queryKey: ['bkmChecker', id, 'spb'],
    queryFn: () => bkmCheckerApi.getSpb(id),
    // A trip has no QR: it is identified by its SPB number, and `/spb` answers 409 for it.
    enabled: !!id && data?.status === 'APPROVED' && !!data.tph_id,
    refetchOnWindowFocus: false,
    // A 409 is a rule the document breaks (e.g. several trucks); retrying cannot fix it.
    retry: (count, error) => (error as { status?: number }).status !== 409 && count < 2,
  });
  const viewShotRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);

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
        <OperationalHistory module="bkmChecker" id={id} />
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShareSpb = async () => {
    try {
      setIsSharing(true);
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Fitur Bagikan', 'Fitur berbagi tidak didukung di perangkat ini.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Bagikan Surat Pengantar Buah (SPB)',
      });
    } catch (err) {
      Alert.alert(
        'Gagal Membagikan',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat gambar SPB.'
      );
    } finally {
      setIsSharing(false);
    }
  };


  const totalJanjang = data.details?.reduce((acc, curr) => acc + curr.jumlah_janjang, 0) ?? 0;
  const trip = isTrip(data);

  return (
    <View style={styles.container}>
      <PageHeader title="Detail Checker" showBackButton onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {data.status === 'APPROVED' && spb.isLoading && <ActivityIndicator color={BrandColors.primary} />}
        {data.status === 'APPROVED' && spb.isError && (spb.error as { status?: number }).status === 409 && (
          <Text style={styles.errorText}>
            SPB tidak dapat diterbitkan: satu SPB hanya untuk satu truk pengiriman Langsung. Checker ini berisi beberapa truk
            atau jenis pengiriman campuran, atau sudah ditimbang. Buat Checker terpisah per truk.
          </Text>
        )}
        {data.status === 'APPROVED' && spb.isError && (spb.error as { status?: number }).status !== 409 && (
          <TouchableOpacity onPress={() => spb.refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>SPB belum tersedia. Coba lagi.</Text>
          </TouchableOpacity>
        )}
        {data.status === 'APPROVED' && spb.data && (
          <View style={styles.qrCardContainer}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 0.95 }}
              style={styles.qrCard}
            >
              <Text style={styles.spbBrandHeader}>SAWITIN • SPB</Text>
              <Text style={styles.qrTitle}>Surat Pengantar Buah (SPB)</Text>
              <Text style={styles.qrSubtitle}>Tunjukkan kode QR ini ke Krani Timbang di Mill Gate</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={spb.data.qr_payload}
                  size={180}
                  color="black"
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.qrPayloadText}>Signature: {data.id.slice(0, 8)}... · Total: {totalJanjang} jjg</Text>

              <View style={styles.spbSummaryCard}>
                <Row label="Blok / TPH" value={`${data.blok?.nama ?? data.blok_id} / ${data.tph?.nama ?? data.tph_id}`} />
                <Row label="Tanggal" value={data.tanggal_laporan} />
                {data.details?.[0] && (
                  <>
                    <Row label="No. Truk" value={data.details[0].kendaraan?.nomor_kendaraan || data.details[0].nomor_truk || '-'} />
                    <Row label="Sopir" value={data.details[0].nama_sopir || '-'} />
                    <Row label="Tujuan" value={data.details[0].tujuan_kirim || '-'} />
                  </>
                )}
              </View>
            </ViewShot>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareSpb}
              disabled={isSharing}
              activeOpacity={0.7}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={BrandColors.primary} />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color={BrandColors.primary} />
                  <Text style={styles.shareButtonText}>Bagikan Tiket SPB (Gambar)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          {trip ? (
            <>
              <Row label="Nomor SPB" value={data.nomor_spb ?? '-'} />
              <Row label="Berangkat" value={data.dispatched_at ?? data.tanggal_laporan} />
              <Row label="Truk" value={data.nomor_truk || '-'} />
              <Row label="Sopir" value={data.nama_sopir || '-'} />
              <Row label="Tujuan" value={data.tujuan_kirim || '-'} />
            </>
          ) : (
            <>
              <Row label="Blok" value={data.blok?.nama ?? data.blok_id ?? '-'} />
              <Row label="TPH" value={data.tph?.nama ?? data.tph_id ?? '-'} />
              <Row label="Tanggal" value={data.tanggal_laporan} />
              <Row label="Truk dokumen" value={data.details?.find((row) => row.tipe_pengiriman !== 'RESTAN')?.kendaraan?.nomor_kendaraan
                || data.details?.find((row) => row.tipe_pengiriman !== 'RESTAN')?.nomor_truk || '-'} />
              {data.bkm_panen_id && <Row label="BKM Panen" value={data.bkm_panen_id} />}
            </>
          )}
          <Row label="Status" value={data.status} />
          {data.keterangan && <Row label="Keterangan" value={data.keterangan} />}
        </View>

        <Text style={styles.sectionTitle}>{trip ? 'Muatan' : 'Detail'} ({data.details?.length ?? 0})</Text>
        {(data.details ?? []).map((d) => (
          <View key={d.id} style={styles.detailCard}>
            {trip ? (
              <Text style={styles.detailTitle}>
                {d.tph?.nama ?? d.tph_id ?? '-'} · {d.tipe_pengiriman === 'TITIP' ? 'Titip (restan)' : d.tipe_pengiriman === 'LANGSUNG' ? 'Langsung' : d.tipe_pengiriman}
              </Text>
            ) : (
              <>
                <Text style={styles.detailTitle}>{d.tipe_pengiriman} · Truk: {d.nomor_truk || '-'}</Text>
                <Text style={styles.detailValue}>Sopir: {d.nama_sopir || '-'} · Tujuan: {d.tujuan_kirim || '-'}</Text>
              </>
            )}
            <Text style={styles.detailValue}>
              Normal: {d.janjang_normal} | Mentah: {d.buah_mentah} | Over: {d.over_ripe} | Brondol (kg): {d.jumlah_brondol}
            </Text>
            <Text style={styles.detailValue}>
              Total Janjang: {d.jumlah_janjang}
            </Text>
          </View>
        ))}

        {/* A trip is approved by the daily close (phase 5); only an old single-TPH Checker keeps its own approve. */}
        <OperationalActions module="bkmChecker" document={data} />
        {!trip && <OperationalDraftEditor module="bkmChecker" document={data} />}
        <OperationalHistory module="bkmChecker" id={id} />
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
  qrCardContainer: {
    marginBottom: 16,
  },
  qrCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  spbBrandHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  qrTitle: {
    fontSize: 16,
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
    marginBottom: 12,
  },
  spbSummaryCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.primary,
    borderRadius: 6,
    marginTop: 12,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
  },
});
