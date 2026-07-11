import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { BkmPanenDetail as BkmPanenDetailType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { GradeItem } from "./GradeItem";

export function DetailCard({ detail }: { detail: BkmPanenDetailType }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="person" size={16} color={BrandColors.primary} />
        <Text style={styles.title}>{detail.pekerja?.member?.nama ?? detail.pekerja_id}</Text>
      </View>
      <Text style={styles.meta}>
        TPH: {detail.tph?.nama ?? detail.tph_id} &bull; {detail.jenis_pekerjaan}
      </Text>
      <View style={styles.gradingGrid}>
        <GradeItem label="Normal" value={detail.janjang_normal} />
        <GradeItem label="Mentah" value={detail.buah_mentah} />
        <GradeItem label="Over" value={detail.over_ripe} />
        <GradeItem label="T.Panjang" value={detail.tangkai_panjang} />
        <GradeItem label="Abnormal" value={detail.buah_abnormal} />
        <GradeItem label="Kosong" value={detail.janjang_kosong} />
      </View>
      {detail.jumlah_brondol != null && (
        <Text style={styles.brondol}>Brondolan: {detail.jumlah_brondol} kg</Text>
      )}
      {detail.note && <Text style={styles.note}>Catatan: {detail.note}</Text>}
      <Text style={styles.total}>Total Janjang: {detail.jumlah_janjang}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 12, marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "600", color: BrandColors.textPrimary },
  meta: { fontSize: 12, color: BrandColors.textMuted, marginBottom: 8 },
  gradingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  brondol: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 6 },
  note: { fontSize: 12, color: BrandColors.textMuted, marginTop: 4, fontStyle: "italic" },
  total: { fontSize: 13, fontWeight: "600", color: BrandColors.primary, marginTop: 6 },
});
