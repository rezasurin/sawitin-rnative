import { useAuthStore } from "@/stores/useAuthStore";
import { useOrgSetting } from "@/hooks/useOrgConfig";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BrandColors } from "@/constants/Colors";
import { Href, useRouter, useSegments } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: Href;
  permission?: string;
  permissionAction?: "write" | "read";
  /** Weighbridge entry: shown only when the organization has its own weighbridge. */
  needsWeighbridge?: boolean;
}

export const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  "(admin)": [
    { id: "bkm-add", label: "Buat BKM Panen", icon: "book", route: "/(admin)/bkm/add", permission: "mod_bkm_panen", permissionAction: "write" },
    { id: "checker-add", label: "Input Checker", icon: "check-square-o", route: "/(admin)/checker/add", permission: "mod_bkm_checker", permissionAction: "write" },
    { id: "timbangan-scan", label: "Pindai Timbangan", icon: "qrcode", route: "/(admin)/timbangan/scan", permission: "mod_krani_timbang", permissionAction: "write", needsWeighbridge: true },
    { id: "observasi-add", label: "Catat Observasi", icon: "eye", route: "/(admin)/observasi/add" as Href, permission: "mod_bkm_rawat", permissionAction: "write" },
    { id: "usage-list", label: "Pemakaian Kendaraan", icon: "truck", route: "/(admin)/pemakaian-kendaraan" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
  ],
  "(mandor)": [
    {
      id: "bkm-add",
      label: "Buat BKM Panen",
      icon: "money",
      route: "/(mandor)/bkm/add",
    },
    {
      id: "checker-add",
      label: "Input Checker",
      icon: "check-square-o",
      route: "/(mandor)/checker/add",
    },
    { id: "rawat-add", label: "Buat BKM Rawat", icon: "leaf", route: "/(mandor)/rawat/add" as Href, permission: "mod_bkm_rawat", permissionAction: "write" },
    { id: "rawat-list", label: "BKM Rawat", icon: "list-ul", route: "/(mandor)/rawat" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
    { id: "observasi-add", label: "Catat Observasi", icon: "eye", route: "/(mandor)/observasi/add" as Href, permission: "mod_bkm_rawat", permissionAction: "write" },
    { id: "observasi-list", label: "Riwayat Observasi", icon: "list", route: "/(mandor)/observasi" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
    { id: "usage-list", label: "Pemakaian Kendaraan", icon: "truck", route: "/(mandor)/pemakaian-kendaraan" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
  ],
  "(asisten)": [
    { id: "observasi-list", label: "Observasi Lapangan", icon: "eye", route: "/(asisten)/observasi" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
    { id: "usage-list", label: "Pemakaian Kendaraan", icon: "truck", route: "/(asisten)/pemakaian-kendaraan" as Href, permission: "mod_bkm_rawat", permissionAction: "read" },
    { id: "stock-list", label: "Stok Opname", icon: "list-alt", route: "/(asisten)/stock-opname" as Href, permission: "mod_material", permissionAction: "read" },
  ],
};

export function QuickActions() {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const weighbridge = useOrgSetting("jembatan_timbang");
  const segments = useSegments();
  const currentGroup = segments[0] ?? "";
  const actions = (ROLE_ACTIONS[currentGroup] ?? []).filter((action) =>
    (weighbridge || !action.needsWeighbridge) && (!action.permission || (hasPermission(action.permission, "read") && hasPermission(action.permission, action.permissionAction ?? "read"))),
  );

  if (actions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aksi Cepat</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <View
            key={action.id}
            style={[
              styles.actionItem,
              (actions.length === 1 || width < 360 || fontScale > 1.3) && styles.actionItemFull,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.actionCardPressable,
                pressed && styles.actionCardPressableActive,
              ]}
              onPress={() =>
                router.push(action.route)
              }
            >
              <View style={styles.actionCard}>
                <View style={styles.iconContainer}>
                  <FontAwesome
                    name={action.icon as any}
                    size={20}
                    color={BrandColors.primary}
                  />
                </View>
                <Text style={styles.actionLabel}>
                  {action.label}
                </Text>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.textPrimary,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  actionItem: {
    width: "50%",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  actionItemFull: {
    width: "100%",
  },
  actionCardPressable: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionCardPressableActive: {
    opacity: 0.65,
  },
  actionCard: {
    flexDirection: "row",

    flex: 1,
    alignItems: "center",
    backgroundColor: BrandColors.cardBg,
    borderRadius: 12,
    padding: 14,
    minHeight: 64,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(107, 123, 60, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    flex: 1,
  },
});
