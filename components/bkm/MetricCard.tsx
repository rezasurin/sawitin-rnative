import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "45%", backgroundColor: BrandColors.cardBg, borderRadius: 8, padding: 12, alignItems: "center" },
  value: { fontSize: 20, fontWeight: "700", color: BrandColors.primary },
  label: { fontSize: 12, color: BrandColors.textSecondary, marginTop: 4 },
});
