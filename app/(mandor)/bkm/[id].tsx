import { useModuleGroup } from '@/hooks/useModuleGroup';
import { OperationalActions } from '@/components/bkm/OperationalActions';
import { OperationalHistory } from '@/components/bkm/OperationalHistory';
import { useOperationalPolicy } from '@/hooks/useOperationalPolicy';
import { PageHeader } from "@/components/home";
import { View } from "@/components/Themed";
import { DetailCard } from "@/components/bkm/DetailCard";
import { DocStatusBadge } from "@/components/bkm/DocStatusBadge";
import { MetricCard } from "@/components/bkm/MetricCard";
import { BrandColors } from "@/constants/Colors";
import { useBkmPanenDetail } from "@/hooks/useBkmPanen";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export default function BkmDetailScreen() {
  const group = useModuleGroup('(mandor)');
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useBkmPanenDetail(id);
  const policy = useOperationalPolicy('bkmPanen', data?.status, data?.details?.length);
  const metrics = useMemo(() => {
    const details = data?.details ?? [];
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
    const totalBrondol = details.reduce((sum, d) => sum + (Number(d.jumlah_brondol) || 0), 0);
    const hasBrondol = details.some((d) => d.jumlah_brondol != null);
    const tphCount = new Set(details.map((d) => d.tph_id)).size;
    return { totalJanjang, totalBrondol, hasBrondol, tphCount };
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showBackButton onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <PageHeader title="Detail BKM" showBackButton onBack={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={BrandColors.error} />
          <Text style={styles.errorText}>Gagal memuat data</Text>
          <OperationalHistory module="bkmPanen" id={id} />
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const details = data.details ?? [];

  return (
    <View style={styles.container}>
      <PageHeader title="Detail BKM" showBackButton onBack={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{data.blok?.nama ?? data.blok_id}</Text>
            <DocStatusBadge status={data.status} />
          </View>
          <Text style={styles.sectionDate}>{data.tanggal_laporan}</Text>
          {data.lahan?.nama && <Text style={styles.sectionMeta}>Lahan: {data.lahan.nama}</Text>}
          {data.grup_pekerja?.nama && <Text style={styles.sectionMeta}>Grup: {data.grup_pekerja.nama}</Text>}
          {data.keterangan && <Text style={styles.keterangan}>{data.keterangan}</Text>}
          {data.rejection_note && (
            <View style={styles.rejectionNoteBox}>
              <Ionicons name="warning-outline" size={14} color={BrandColors.error} />
              <Text style={styles.rejectionNoteText}>Alasan Revisi: {data.rejection_note}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Ringkasan Produksi</Text>
        <View style={styles.metricsGrid}>
          <MetricCard label="Pekerja" value={String(details.length)} />
          <MetricCard label="TPH" value={String(metrics.tphCount)} />
          <MetricCard label="Total Janjang" value={String(metrics.totalJanjang)} />
          <MetricCard label="Brondol (kg)" value={metrics.hasBrondol ? `${metrics.totalBrondol} kg` : '—'} />
        </View>

        <Text style={styles.sectionLabel}>Detail per Pekerja</Text>
        {details.length > 0 ? (
          details.map((detail) => <DetailCard key={detail.id} detail={detail} />)
        ) : (
          <View style={styles.emptyDetails}>
            <Ionicons name="document-text-outline" size={32} color={BrandColors.textMuted} />
            <Text style={styles.emptyDetailsText}>Belum ada detail</Text>
          </View>
        )}

        {policy.edit && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButtonSm]}
              onPress={() => router.push(`/${group}/bkm/edit?id=${id}`)}
            >
              <Ionicons name="create-outline" size={18} color={BrandColors.white} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <OperationalActions module="bkmPanen" document={data} />
        <OperationalHistory module="bkmPanen" id={id} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  errorText: { color: BrandColors.error, fontSize: 15, marginTop: 12 },
  retryText: { color: BrandColors.primary, fontSize: 14, fontWeight: "600", marginTop: 8 },
  sectionHeader: { backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: BrandColors.textPrimary, flex: 1, marginRight: 12 },
  sectionDate: { fontSize: 14, color: BrandColors.textSecondary },
  sectionMeta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  keterangan: { fontSize: 13, color: BrandColors.textSecondary, marginTop: 8, fontStyle: "italic" },
  sectionLabel: { fontSize: 16, fontWeight: "600", color: BrandColors.textPrimary, marginBottom: 12, marginTop: 8 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  emptyDetails: { alignItems: "center", paddingVertical: 24 },
  emptyDetailsText: { color: BrandColors.textMuted, fontSize: 13, marginTop: 8 },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 16, paddingBottom: 20 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, gap: 8 },
  rejectButton: { backgroundColor: BrandColors.error },
  approveButton: { backgroundColor: BrandColors.success },
  rejectButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  approveButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  revokeButton: { backgroundColor: "#E67E22" },
  cancelButton: { backgroundColor: "#757575" },
  revokeButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  rejectionNoteBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, padding: 10, backgroundColor: "#FFF3E0", borderRadius: 6, borderLeftWidth: 3, borderLeftColor: BrandColors.error },
  rejectionNoteText: { fontSize: 13, color: BrandColors.error, flex: 1 },
  editButtonContainer: { marginTop: 16 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, backgroundColor: BrandColors.primary, gap: 8 },
  editButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.white },
  editButtonSm: { backgroundColor: BrandColors.primary },
  submitButton: { backgroundColor: BrandColors.success },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: BrandColors.error, backgroundColor: "transparent", gap: 8, marginTop: 12, paddingBottom: 20 },
  deleteButtonDisabled: { opacity: 0.5 },
  deleteButtonText: { fontSize: 15, fontWeight: "600", color: BrandColors.error },
});
