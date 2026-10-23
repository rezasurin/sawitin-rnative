import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text } from "react-native";

/** A label and its value on one line; an empty value shows a dash. */
export function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, backgroundColor: "transparent" },
  label: { fontSize: 14, color: BrandColors.textSecondary },
  value: { fontSize: 14, fontWeight: "500", color: BrandColors.textPrimary, maxWidth: "60%", textAlign: "right" },
});
