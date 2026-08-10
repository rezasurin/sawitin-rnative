import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandColors } from '@/constants/Colors';
import { PageHeader } from '@/components/home';
import { bkmCheckerApi } from '@/services/bkm-checker.service';
import { useCreateKraniTimbang } from '@/hooks/useKraniTimbang';
import { useOrgConfig } from '@/hooks/useOrgConfig';

export default function TimbanganScreen() {
  const router = useRouter();
  const { checkerId } = useLocalSearchParams<{ checkerId: string }>();

  // Form states
  const [timbangIsi, setTimbangIsi] = useState('');
  const [timbangKosong, setTimbangKosong] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Query BKM Checker details
  const { data: checker, isLoading, isError, refetch } = useQuery({
    queryKey: ['bkmChecker', checkerId],
    queryFn: () => bkmCheckerApi.getById(checkerId!),
    enabled: !!checkerId,
  });

  const createMutation = useCreateKraniTimbang();

  const { data: orgConfig } = useOrgConfig();
  const bjr = orgConfig?.bjr ?? 15;

  // Reset form when checkerId changes
  useEffect(() => {
    setTimbangIsi('');
    setTimbangKosong('');
    setKeterangan('');
  }, [checkerId]);

  // Calculate Netto in real-time
  const isiVal = parseFloat(timbangIsi) || 0;
  const kosongVal = parseFloat(timbangKosong) || 0;
  const nettoVal = Math.max(0, isiVal - kosongVal);

  const handleSubmit = () => {
    if (!checker) return;
    if (!timbangIsi || !timbangKosong) {
      Alert.alert('Form Belum Lengkap', 'Silakan isi timbang isi dan timbang kosong.');
      return;
    }

    if (isiVal <= kosongVal) {
      Alert.alert('Validasi Berat', 'Timbang isi harus lebih besar daripada timbang kosong.');
      return;
    }

    const firstDetail = checker.details?.[0];
    const payload = {
      nama_supir: firstDetail?.nama_sopir || 'Sopir SPB',
      nomor_kendaraan: firstDetail?.nomor_truk || 'Kendaraan SPB',
      tujuan_kirim: firstDetail?.tujuan_kirim || 'Pabrik',
      tanggal: new Date().toISOString().split('T')[0],
      timbang_isi: isiVal,
      timbang_kosong: kosongVal,
      netto: nettoVal,
      origin_source: 'BKM_CHECKER' as const,
      keterangan: keterangan || undefined,
      source_checker_ids: [checkerId],
      details: [
        {
          kelompok_lahan_id: checker.blok?.kelompok_lahan_id || '',
          tph_id: checker.tph_id || '',
          jumlah_janjang: totalJanjang,
          jumlah_brondol: totalBrondol,
        }
      ],
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Berhasil', 'Data timbangan berhasil disimpan.', [
          {
            text: 'OK',
            onPress: () => {
              router.setParams({ checkerId: undefined });
              router.replace('/(krani)');
            },
          },
        ]);
      },
      onError: (err) => {
        Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data timbangan.');
      },
    });
  };

  const totalJanjang = checker?.details?.reduce((acc, curr) => acc + curr.jumlah_janjang, 0) ?? 0;
  const totalBrondol = checker?.details?.reduce((acc, curr) => acc + curr.jumlah_brondol, 0) ?? 0;
  const estimatedKg = (totalJanjang * bjr);

  const BackButton = (
    <Pressable
      onPress={() => {
        router.setParams({ checkerId: undefined });
        router.replace('/(krani)');
      }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <FontAwesome name="arrow-left" size={20} color={BrandColors.white} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <PageHeader
        title="Timbangan"
        showMenuButton={!checkerId}
        actionBtn={checkerId ? BackButton : undefined}
      />
      
      {!checkerId ? (
        <View style={styles.centerContent}>
          <View style={styles.promptCard}>
            <FontAwesome name="balance-scale" size={64} color={BrandColors.primary} style={styles.promptIcon} />
            <Text style={styles.promptTitle}>Pindai QR SPB</Text>
            <Text style={styles.promptText}>
              Silakan pindai kode QR Surat Pengantar Buah (SPB) terlebih dahulu untuk memuat data supir, kendaraan, dan muatan secara otomatis.
            </Text>
            <Pressable
              style={styles.scanBtn}
              onPress={() => router.push('/(krani)/scan')}
            >
              <FontAwesome name="qrcode" size={18} color={BrandColors.white} />
              <Text style={styles.scanBtnText}>Buka Kamera Scanner</Text>
            </Pressable>
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat data SPB...</Text>
        </View>
      ) : isError || !checker ? (
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-triangle" size={48} color={BrandColors.error} />
          <Text style={styles.errorText}>Gagal mengambil data SPB</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: SPB Summary Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardHeaderTitle}>Informasi Dokumen SPB</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Nama Sopir</Text>
              <Text style={styles.value}>{checker.details?.[0]?.nama_sopir || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nomor Kendaraan</Text>
              <Text style={styles.value}>{checker.details?.[0]?.nomor_truk || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tujuan Kirim</Text>
              <Text style={styles.value}>{checker.details?.[0]?.tujuan_kirim || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Blok / TPH Asal</Text>
              <Text style={styles.value}>
                {checker.blok?.nama ?? '-'} / {checker.tph?.nama ?? '-'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Janjang / Brondol</Text>
              <Text style={styles.value}>
                {totalJanjang} Janjang / {totalBrondol} kg
              </Text>
            </View>
          </View>

          {/* Section: Weighing Form Inputs */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Input Timbangan Jembatan</Text>
            <View style={styles.divider} />

            {/* Input 1: Gross Weight */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Timbang Isi (Gross) - kg</Text>
              <TextInput
                style={styles.input}
                value={timbangIsi}
                onChangeText={setTimbangIsi}
                placeholder="Masukkan berat isi kendaraan"
                keyboardType="numeric"
                placeholderTextColor={BrandColors.textMuted}
              />
            </View>

            {/* Input 2: Tare Weight */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Timbang Kosong (Tare) - kg</Text>
              <TextInput
                style={styles.input}
                value={timbangKosong}
                onChangeText={setTimbangKosong}
                placeholder="Masukkan berat kosong kendaraan"
                keyboardType="numeric"
                placeholderTextColor={BrandColors.textMuted}
              />
            </View>

            {/* Output: Netto Weight */}
            <View style={styles.nettoContainer}>
              <Text style={styles.nettoLabel}>Berat Bersih (Netto)</Text>
              <Text style={styles.nettoValue}>
                {nettoVal.toLocaleString('id-ID')} <Text style={styles.kg}>kg</Text>
              </Text>
              {totalJanjang > 0 && (
                <Text style={styles.estimateText}>
                  Estimasi dari janjang: {estimatedKg.toLocaleString('id-ID')} kg ({totalJanjang} jjg × {bjr} kg)
                </Text>
              )}
            </View>

            {/* Keterangan */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Keterangan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={keterangan}
                onChangeText={setKeterangan}
                placeholder="Tambahkan catatan jika diperlukan..."
                multiline
                numberOfLines={3}
                placeholderTextColor={BrandColors.textMuted}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                createMutation.isPending && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color={BrandColors.white} />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={18} color={BrandColors.white} />
                  <Text style={styles.submitBtnText}>Simpan Timbangan</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  promptCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  promptIcon: {
    marginBottom: 20,
  },
  promptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  scanBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  scanBtnText: {
    color: BrandColors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: BrandColors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.error,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: BrandColors.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: '#F9FBF7',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAEFE6',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDEDED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    textAlign: 'right',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: BrandColors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: 80,
  },
  nettoContainer: {
    backgroundColor: '#F1F8E9',
    borderColor: '#DCEDC8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 20,
  },
  nettoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#558B2F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nettoValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#33691E',
  },
  kg: {
    fontSize: 18,
    fontWeight: '600',
  },
  estimateText: {
    fontSize: 13,
    color: '#558B2F',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  submitBtnPressed: {
    backgroundColor: BrandColors.primaryDark,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
