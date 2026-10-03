import { Badge } from "@/components/core/Badge";
import { BrandColors } from "@/constants/Colors";
import type { DocumentStatus } from "@/types";
import React from "react";

const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: "#F0F0F0", label: "Draft" },
  SUBMITTED: { color: "#2196F3", bg: "#E3F2FD", label: "Submitted" },
  APPROVED: { color: BrandColors.success, bg: "#E8F5E9", label: "Approved" },
  REVISION_REQUESTED: { color: BrandColors.error, bg: "#FFEBEE", label: "Revisi" },
  CANCELLED: { color: "#9E9E9E", bg: "#F5F5F5", label: "Cancelled" },
};

export function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
}
