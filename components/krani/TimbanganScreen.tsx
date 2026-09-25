import { OperationalActions } from '@/components/bkm/OperationalActions';
import { OperationalHistory } from '@/components/bkm/OperationalHistory';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { OperationalDraftEditor } from '@/components/bkm/OperationalDraftEditor';
import { useModuleGroup } from '@/hooks/useModuleGroup';
import { Button } from "@/components/core/Button";
import { FormField, FormSelect } from "@/components/form";
import { PageHeader } from "@/components/home";
import { BrandColors } from "@/constants/Colors";
import { useKraniTimbangDetail } from "@/hooks/useKraniTimbang";
import { useFleetChoices } from '@/hooks/useFleetChoices';
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { bkmCheckerApi } from "@/services/bkm-checker.service";
import { stagingApi } from "@/services/staging.service";
import { isWholeKg } from '@/utils/field-summary';
import type { KraniTimbang } from "@/types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TimbanganScreen() {
  const policy = useOperationalPolicy('kraniTimbang');
  const group = useModuleGroup('(krani)');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkerId, detailId, qrPayload } = useLocalSearchParams<{
    checkerId?: string;
    detailId?: string;
    qrPayload?: string;
  }>();

  // Form states
  const [timbangIsi, setTimbangIsi] = useState("");
  const [timbangKosong, setTimbangKosong] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [nomorDokumen, setNomorDokumen] = useState('');
  const [brondolTruk, setBrondolTruk] = useState('');
  const [kendaraanId, setKendaraanId] = useState('');
  const [supirId, setSupirId] = useState('');
  const [nomorKendaraan, setNomorKendaraan] = useState('');
  const [namaSupir, setNamaSupir] = useState('');
  const [manualVehicle, setManualVehicle] = useState(false);
  const [manualDriver, setManualDriver] = useState(false);
  const initializedCheckerId = useRef<string | null>(null);
  const fleet = useFleetChoices();

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Query BKM Checker details
  const {
    data: checker,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bkmChecker", checkerId],
    queryFn: () => bkmCheckerApi.getById(checkerId!),
    enabled: !!checkerId,
  });

  const {
    data: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useKraniTimbangDetail(detailId ?? "");

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: stagingApi.submitPayload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kraniTimbang'] }),
  });

  const { data: orgConfig } = useOrgConfig();
  const bjr = orgConfig?.bjr ?? 15;

  // Reset form when checkerId changes
  useEffect(() => {
    initializedCheckerId.current = null;
    setTimbangIsi("");
    setTimbangKosong("");
    setKeterangan("");
    setNomorDokumen('');
    setBrondolTruk('');
    setKendaraanId(''); setSupirId('');
    setNomorKendaraan(''); setNamaSupir('');
  }, [checkerId]);

  useEffect(() => {
    const first = checker?.details?.[0];
    if (!first || !checkerId || initializedCheckerId.current === checkerId) return;
    initializedCheckerId.current = checkerId;
    setKendaraanId(first.kendaraan_id ?? '');
    setSupirId(first.supir_id ?? '');
    setNomorKendaraan(first.nomor_truk ?? '');
    setNamaSupir(first.nama_sopir ?? '');
    setManualVehicle(!first.kendaraan_id);
    setManualDriver(!first.supir_id);
  }, [checker]);

  // Helper to parse weight input cleanly (handles Indonesian dot thousand separator e.g. 5.000 -> 5000)
  const parseWeight = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Calculate Netto & validation in real-time
  const isiVal = parseWeight(timbangIsi);
  const kosongVal = parseWeight(timbangKosong);
  const hasIsi = timbangIsi.trim() !== "";
  const hasKosong = timbangKosong.trim() !== "";
  const isWeightInvalid = hasIsi && hasKosong && isiVal <= kosongVal;
  const nettoVal = isWeightInvalid ? 0 : Math.max(0, isiVal - kosongVal);

  const totalJanjang =
    checker?.details?.reduce((acc, curr) => acc + curr.jumlah_janjang, 0) ?? 0;
  const totalBrondol =
    checker?.details?.reduce((acc, curr) => acc + curr.jumlah_brondol, 0) ?? 0;
  const estimatedKg = totalJanjang * bjr;

  const diffKg = Math.abs(nettoVal - estimatedKg);
  const diffPct = estimatedKg > 0 ? (diffKg / estimatedKg) * 100 : 0;
  const hasDiscrepancy = nettoVal > 0 && estimatedKg > 0 && diffPct > 20;

  const handleSubmit = () => {
    if (!policy.create || !checker || !qrPayload) return;
    if (!hasIsi || !hasKosong) {
      Alert.alert(
        "Form Belum Lengkap",
        "Silakan isi timbang isi dan timbang kosong.",
      );
      return;
    }

    if (isWeightInvalid || isiVal <= kosongVal) {
      Alert.alert(
        "Validasi Berat",
        "Timbang isi harus lebih besar daripada timbang kosong.",
      );
      return;
    }

    if (!isWholeKg(brondolTruk)) {
      Alert.alert('Brondol belum valid', 'Masukkan brondol di truk ini dalam kilogram bulat, termasuk 0 jika tidak ada.');
      return;
    }

    const firstDetail = checker.details?.[0];
    if (!firstDetail || !namaSupir.trim() || !nomorKendaraan.trim()) {
      Alert.alert('SPB tidak lengkap', 'Nomor truk dan nama sopir tidak tersedia pada Checker.');
      return;
    }
    const payload = {
      qr_payload: qrPayload,
      ...(kendaraanId ? { kendaraan_id: kendaraanId } : {}),
      ...(supirId ? { supir_id: supirId } : {}),
      ...(nomorDokumen.trim() ? { nomor_dokumen: nomorDokumen.trim() } : {}),
      nama_supir: namaSupir.trim(),
      nomor_kendaraan: nomorKendaraan.trim(),
      tujuan_kirim: firstDetail.tujuan_kirim ?? '',
      keterangan: keterangan || undefined,
      timbang_isi: isiVal,
      timbang_kosong: kosongVal,
      jumlah_brondol: Number(brondolTruk),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert("Berhasil", "Data timbangan berhasil disimpan.", [
          {
            text: "OK",
            onPress: () => {
              router.dismissTo(`/${group}/timbangan`);
            },
          },
        ]);
      },
      onError: (err) => {
        Alert.alert(
          "Gagal",
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menyimpan data timbangan.",
        );
      },
    });
  };

  const handleBack = () => {
    router.dismissTo(`/${group}/timbangan`);
  };

  if (!detailId && (!checkerId || !qrPayload)) return <Redirect href={`/${group}/timbangan/scan`} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <PageHeader
        title={detailId ? "Detail Timbangan" : "Input Timbangan"}
        showBackButton
        onBack={handleBack}
      />

      {detailId ? (
        <DetailTimbanganView
          detail={detail}
          documentId={detailId}
          isLoading={isDetailLoading}
          isError={isDetailError}
          onRetry={() => refetchDetail()}
        />
      ) : isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat data SPB...</Text>
        </View>
      ) : isError || !checker ? (
        <View style={styles.centerContent}>
          <FontAwesome
            name="exclamation-triangle"
            size={48}
            color={BrandColors.error}
          />
          <Text style={styles.errorText}>Gagal mengambil data SPB</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.formContainer}>
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
                <Text style={styles.value}>
                  {checker.details?.[0]?.nama_sopir || "-"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nomor Kendaraan</Text>
                <Text style={styles.value}>
                  {checker.details?.[0]?.nomor_truk || "-"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tujuan Kirim</Text>
                <Text style={styles.value}>
                  {checker.details?.[0]?.tujuan_kirim || "-"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Blok / TPH Asal</Text>
                <Text style={styles.value}>
                  {checker.blok?.nama ?? "-"} / {checker.tph?.nama ?? "-"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Janjang / Brondol Checker (kg)</Text>
                <Text style={styles.value}>
                  {totalJanjang} Janjang / {totalBrondol} kg
                </Text>
              </View>
            </View>

            {/* Section: Weighing Form Inputs */}
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>
                Input Timbangan Jembatan
              </Text>
              <View style={styles.divider} />

              <FormSelect label="Kendaraan" searchable value={manualVehicle ? '__manual__' : kendaraanId}
                options={[...fleet.vehicles.map((row) => ({ label: row.nomor_kendaraan, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
                placeholder="Pilih kendaraan atau ketik manual" onSelect={(id) => {
                  const row = fleet.vehicles.find((vehicle) => vehicle.id === id);
                  setManualVehicle(id === '__manual__'); setKendaraanId(row?.id ?? '');
                  if (row) setNomorKendaraan(row.nomor_kendaraan);
                }} />
              {(manualVehicle || !fleet.vehicles.length) && <FormField label="Nomor kendaraan"
                value={nomorKendaraan} onChangeText={(value) => { setNomorKendaraan(value); setKendaraanId(''); setManualVehicle(true); }} />}
              <FormSelect label="Sopir" searchable value={manualDriver ? '__manual__' : supirId}
                options={[...fleet.drivers.map((row) => ({ label: row.nama, value: row.id })), { label: 'Ketik manual', value: '__manual__' }]}
                placeholder="Pilih sopir atau ketik manual" onSelect={(id) => {
                  const row = fleet.drivers.find((driver) => driver.id === id);
                  setManualDriver(id === '__manual__'); setSupirId(row?.id ?? '');
                  if (row) setNamaSupir(row.nama);
                }} />
              {(manualDriver || !fleet.drivers.length) && <FormField label="Nama sopir"
                value={namaSupir} onChangeText={(value) => { setNamaSupir(value); setSupirId(''); setManualDriver(true); }} />}
              <FormField label="Nomor dokumen perjalanan (opsional)" value={nomorDokumen}
                onChangeText={setNomorDokumen} placeholder="Nomor dari operasi" />

              <FormField label="Brondol di truk ini (kg)" value={brondolTruk}
                onChangeText={(value) => { if (value === '' || isWholeKg(value)) setBrondolTruk(value); }}
                keyboardType="numeric" placeholder="Masukkan kg aktual, 0 jika tidak ada" />

              {/* Input 1: Gross Weight */}
              <FormField
                label="Timbang Isi (Gross) - kg"
                value={timbangIsi}
                onChangeText={setTimbangIsi}
                placeholder="Masukkan berat isi kendaraan (misal: 6355)"
                keyboardType="numeric"
                error={isWeightInvalid ? "Timbang isi harus lebih besar daripada timbang kosong" : undefined}
              />

              {/* Input 2: Tare Weight */}
              <FormField
                label="Timbang Kosong (Tare) - kg"
                value={timbangKosong}
                onChangeText={setTimbangKosong}
                placeholder="Masukkan berat kosong kendaraan (misal: 5200)"
                keyboardType="numeric"
              />

              {/* Output: Netto Weight */}
              <View style={styles.nettoContainer}>
                <Text style={styles.nettoLabel}>Berat Bersih (Netto)</Text>
                <Text style={styles.nettoValue}>
                  {nettoVal.toLocaleString("id-ID")}{" "}
                  <Text style={styles.kg}>kg</Text>
                </Text>
                {totalJanjang > 0 && (
                  <Text style={styles.estimateText}>
                    Estimasi dari janjang: {estimatedKg.toLocaleString("id-ID")}{" "}
                    kg ({totalJanjang} jjg × {bjr} kg)
                  </Text>
                )}
                {hasDiscrepancy && (
                  <View style={styles.discrepancyCard}>
                    <Text style={styles.discrepancyText}>
                      ⚠️ Selisih {diffPct.toFixed(0)}% dari estimasi janjang ({estimatedKg.toLocaleString("id-ID")} kg). Periksa kembali kemungkinan kesalahan input atau muatan berlebih.
                    </Text>
                  </View>
                )}
              </View>

              {/* Keterangan */}
              <FormField
                label="Keterangan (Opsional)"
                value={keterangan}
                onChangeText={setKeterangan}
                placeholder="Tambahkan catatan jika diperlukan..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: keyboardVisible
                  ? Math.max(insets.bottom, 16)
                  : Math.max(insets.bottom + 88, 96),
              },
            ]}
          >
            <Button
              title="Simpan Timbangan"
              onPress={handleSubmit}
              variant="primary"
              disabled={!policy.create || !hasIsi || !hasKosong || isWeightInvalid || createMutation.isPending}
              loading={createMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function DetailTimbanganView({
  detail,
  documentId,
  isLoading,
  isError,
  onRetry,
}: {
  detail?: KraniTimbang;
  documentId: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const group = useModuleGroup('(krani)');
  const router = useRouter();
  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Memuat detail...</Text>
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.centerContent}>
        <FontAwesome
          name="exclamation-triangle"
          size={48}
          color={BrandColors.error}
        />
        <Text style={styles.errorText}>Gagal memuat detail</Text>
        <OperationalHistory module="kraniTimbang" id={documentId} />
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  const details = detail.details ?? [];
  const totalJanjang = details.reduce(
    (acc, d) => acc + (Number(d.jumlah_janjang) || 0),
    0,
  );
  const totalBrondol = details.reduce(
    (acc, d) => acc + (Number(d.jumlah_brondol) || 0),
    0,
  );

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.detailScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Button title="Tiket PKS" onPress={() => router.push(`/${group}/timbangan/tiket/${documentId}` as never)} />
      <Button title="Lihat jejak panen" variant="secondary" onPress={() => router.push(`/${group}/timbangan/trace/${documentId}` as never)} />
      <View style={styles.infoCard}>
        <Text style={styles.cardHeaderTitle}>Informasi Dokumen</Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>No. Dokumen</Text>
          <Text style={styles.value}>{detail.nomor_dokumen || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nama Sopir</Text>
          <Text style={styles.value}>{detail.nama_supir || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nomor Kendaraan</Text>
          <Text style={styles.value}>{detail.nomor_kendaraan || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tujuan Kirim</Text>
          <Text style={styles.value}>{detail.tujuan_kirim || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tanggal</Text>
          <Text style={styles.value}>{detail.tanggal || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Janjang / Brondol ditimbang (kg)</Text>
          <Text style={styles.value}>
            {totalJanjang} Janjang / {totalBrondol} kg
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardHeaderTitle}>Hasil Timbangan</Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Timbang Isi (Gross)</Text>
          <Text style={styles.value}>
            {detail.timbang_isi?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Timbang Kosong (Tare)</Text>
          <Text style={styles.value}>
            {detail.timbang_kosong?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Berat Bersih (Netto)</Text>
          <Text
            style={[
              styles.value,
              { color: BrandColors.primary, fontWeight: "800" },
            ]}
          >
            {detail.netto?.toLocaleString("id-ID") ?? 0} kg
          </Text>
        </View>
        {detail.keterangan ? (
          <Text style={styles.detailNote}>Catatan: {detail.keterangan}</Text>
        ) : null}
      </View>

      {details.length > 0 ? (
        <View style={styles.formCard}>
          <Text style={styles.cardHeaderTitle}>Detail Muatan</Text>
          <View style={styles.divider} />
          {details.map((d) => (
            <View key={d.id} style={styles.detailMuatanRow}>
              <Text style={styles.detailMuatanText}>
                {d.kelompok_lahan?.nama ?? d.kelompok_lahan_id} /{" "}
                {d.tph?.nama ?? d.tph_id}
              </Text>
              <Text style={styles.detailMuatanText}>
                {d.jumlah_janjang} jjg / {d.jumlah_brondol} kg
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {detail.origin_source === 'MANUAL' && <OperationalActions module="kraniTimbang" document={detail} />}
      {detail.origin_source === 'MANUAL' && <OperationalDraftEditor module="kraniTimbang" document={detail} />}
      <OperationalHistory module="kraniTimbang" id={detail.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: BrandColors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.error,
    fontWeight: "600",
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
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: BrandColors.inputBorder,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailNote: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontStyle: "italic",
    marginTop: 12,
  },
  detailMuatanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailMuatanText: {
    fontSize: 14,
    color: BrandColors.textPrimary,
    flex: 1,
  },
  infoCard: {
    backgroundColor: "#F9FBF7",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAEFE6",
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EDEDED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    textAlign: "right",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: "#FAFAFA",
  },
  multilineInput: {
    textAlignVertical: "top",
    height: 80,
  },
  nettoContainer: {
    backgroundColor: "#F1F8E9",
    borderColor: "#DCEDC8",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginVertical: 8,
    marginBottom: 20,
  },
  nettoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#558B2F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nettoValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#33691E",
  },
  kg: {
    fontSize: 18,
    fontWeight: "600",
  },
  estimateText: {
    fontSize: 13,
    color: "#558B2F",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  discrepancyCard: {
    backgroundColor: "#FFF3E0",
    borderColor: "#E65100",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    width: "100%",
  },
  discrepancyText: {
    fontSize: 12,
    color: "#E65100",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
});
