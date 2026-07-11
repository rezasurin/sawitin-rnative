import { View } from "@/components/Themed";
import { BrandColors } from "@/constants/Colors";
import type { DocumentStatus } from "@/types";
import React from "react";
import { StyleSheet, Text } from "react-native";

const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: "#F0F0F0", label: "Draft" },
  SUBMITTED: { color: "#2196F3", bg: "#E3F2FD", label: "Submitted" },
  APPROVED: { color: BrandColors.success, bg: "#E8F5E9", label: "Approved" },
  REVISION_REQUESTED: { color: BrandColors.error, bg: "#FFEBEE", label: "Revisi" },
  CANCELLED: { color: "#9E9E9E", bg: "#F5F5F5", label: "Cancelled" },
};

export function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  text: { fontSize: 12, fontWeight: "600" },
});
