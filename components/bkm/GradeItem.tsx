import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

export function GradeItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: "center", backgroundColor: BrandColors.background, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, minWidth: 50 },
  label: { fontSize: 10, color: BrandColors.textMuted, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: "600", color: BrandColors.textPrimary },
});
