import { Card } from "@/components/core/Card";
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { BkmPanen } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { DocStatusBadge } from "./DocStatusBadge";

export function PanenCard({
  item,
  onPress,
  onLongPress,
}: {
  item: BkmPanen;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Card>
      <TouchableOpacity accessibilityRole="button"
        accessibilityLabel={`BKM Panen, ${item.blok?.nama ?? item.blok_id}, ${item.tanggal_laporan}, ${item.status}`}
        accessibilityHint={onLongPress ? 'Ketuk untuk detail. Tekan lama untuk pilihan dokumen.' : 'Ketuk untuk membuka detail dokumen.'}
        accessibilityActions={onLongPress ? [{ name: 'activate' }, { name: 'longpress', label: 'Pilihan dokumen' }] : [{ name: 'activate' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'longpress') onLongPress?.();
          else if (nativeEvent.actionName === 'activate') onPress();
        }}
        onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="leaf" size={18} color={BrandColors.primary} />
            <Text style={styles.title}>{item.blok?.nama ?? item.blok_id}</Text>
          </View>
          <DocStatusBadge status={item.status} />
        </View>
        <View style={styles.body}>
          <Text style={styles.date}>{item.tanggal_laporan}</Text>
          {item.lahan?.nama && <Text style={styles.meta}>Lahan: {item.lahan.nama}</Text>}
          {item.keterangan ? <Text style={styles.meta} numberOfLines={2}>{item.keterangan}</Text> : null}
          <Text style={styles.detailCount}>{item.details?.length ?? 0} detail</Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexWrap: "wrap", gap: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  titleRow: { flex: 1, minWidth: 0, marginRight: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: BrandColors.textPrimary },
  body: {},
  date: { fontSize: 14, color: BrandColors.textSecondary },
  meta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  detailCount: { fontSize: 12, color: BrandColors.primary, fontWeight: "600", marginTop: 6 },
});
