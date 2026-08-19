import { Card } from "@/components/core/Card";
import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { BkmChecker } from "@/types/bkm-checker";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { DocStatusBadge } from "./DocStatusBadge";

export function CheckerCard({
  item,
  onPress,
  onLongPress,
}: {
  item: BkmChecker;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const totalJanjang =
    item.details?.reduce((sum, d) => sum + d.jumlah_janjang, 0) ?? 0;

  return (
    <Card>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={BrandColors.primary}
            />
            <Text style={styles.title}>{item.blok?.nama ?? item.blok_id}</Text>
          </View>
          <DocStatusBadge status={item.status} />
        </View>
        <View style={styles.body}>
          <Text style={styles.date}>{item.tanggal_laporan}</Text>
          <Text style={styles.meta}>TPH: {item.tph?.nama ?? item.tph_id}</Text>
          {item.keterangan ? (
            <Text style={styles.meta} numberOfLines={2}>
              {item.keterangan}
            </Text>
          ) : null}
          <Text style={styles.detailCount}>
            {item.details?.length ?? 0} truk · {totalJanjang} janjang
          </Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    backgroundColor: "transparent",
  },
  body: {
    backgroundColor: "transparent",
  },
  date: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    backgroundColor: "transparent",
  },
  meta: { fontSize: 13, color: BrandColors.textMuted, marginTop: 2 },
  detailCount: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: "600",
    marginTop: 6,
  },
});
