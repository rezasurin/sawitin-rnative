import { Badge } from "@/components/core/Badge";
import { BrandColors } from "@/constants/Colors";
import type { DocumentStatus } from "@/types";
import React from "react";

// Same words as the web StatusBadge: one document, one name for its state on both.
const STATUS_CONFIG: Record<DocumentStatus, { color: string; bg: string; label: string }> = {
  DRAFT: { color: BrandColors.textMuted, bg: "#F0F0F0", label: "Draft" },
  SUBMITTED: { color: "#2196F3", bg: "#E3F2FD", label: "Diajukan" },
  APPROVED: { color: BrandColors.success, bg: "#E8F5E9", label: "Disetujui" },
  REVISION_REQUESTED: { color: BrandColors.error, bg: "#FFEBEE", label: "Perlu Revisi" },
  CANCELLED: { color: "#9E9E9E", bg: "#F5F5F5", label: "Dibatalkan" },
};

/** The status in words; one this app does not know is shown as sent, never as Draft. */
export const statusLabel = (status: string | null | undefined) =>
  status ? STATUS_CONFIG[status as DocumentStatus]?.label ?? status : "-";

export function DocStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { color: BrandColors.textMuted, bg: "#F0F0F0", label: statusLabel(status) };
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
}
