import { useAuthStore } from "@/stores/useAuthStore";
import { MenuItem as MenuItemType } from "@/types/home";
import React from "react";
import { Text, View, Alert } from "react-native";
import { BrandColors } from "@/constants/Colors";
import { MenuItem } from "./MenuItem";
import { useRouter, useSegments, RelativePathString } from "expo-router";

/**
 * MenuGrid Component
 * Single Responsibility: Display 4-column grid of menu items
 */

const MENU_ITEMS: MenuItemType[] = [
  {
    id: "absensi",
    label: "Absensi",
    icon: "calendar-check-o",
    requiredPermission: { moduleId: "mod_absensi", action: "read" },
  },
  {
    id: "planning",
    label: "Planning",
    icon: "calendar",
    requiredPermission: { moduleId: "mod_planning", action: "read" },
  },
  {
    id: "bkm",
    label: "BKM",
    icon: "money",
    route: "(mandor)/bkm" as RelativePathString,
    requiredPermission: { moduleId: "mod_bkm_panen", action: "write" },
  },
  {
    id: "approval",
    label: "Approval",
    icon: "check-square-o",
    requiredPermission: { moduleId: "mod_bkm_panen", action: "approve" },
  },
  {
    id: "panen",
    label: "Panen",
    icon: "leaf",
    route: "(pemanen)" as RelativePathString,
    requiredPermission: { moduleId: "mod_bkm_panen", action: "read" },
  },
  {
    id: "loading",
    label: "Muat",
    icon: "truck",
    route: "(krani)" as RelativePathString,
    requiredPermission: { moduleId: "mod_krani_timbang", action: "write" },
  },
  {
    id: "rawat",
    label: "Rawat",
    icon: "medkit",
    route: "(mandor)/rawat" as RelativePathString,
    requiredPermission: { moduleId: "mod_bkm_rawat", action: "write" },
  },
  {
    id: "laporan",
    label: "Laporan",
    icon: "file-text-o",
    requiredPermission: { moduleId: "mod_laporan", action: "read" },
  },
];

export function MenuGrid() {
  const router = useRouter();
  const segments = useSegments();
  const { hasPermission, roles } = useAuthStore();

  // Feature Flag: Check if Role Based Menu is enabled
  // Note: ensure this environment variable is exposed to the client (process.env.EXPO_ENABLED_ROLE_BASED_MENU)
  const isRoleBasedMenuEnabled =
    process.env.EXPO_ENABLED_ROLE_BASED_MENU === "true";

  const isAdmin = roles.some(
    (role) => role.nama.toLowerCase() === "administrator"
  );

  const currentGroup = segments[0]; // e.g. "(mandor)"

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (isAdmin) return true; // Administrator sees all items

    if (!isRoleBasedMenuEnabled) return true; // If disabled, show all items

    // Filter by Route Group Relevance
    if (item.route) {
      // Extract the route group from the item's route, e.g. "(mandor)" from "(mandor)/bkm"
      const itemGroupMatch = item.route.match(/^\((.*?)\)/);
      const itemGroup = itemGroupMatch ? itemGroupMatch[0] : null;

      // If the item belongs to a specific group, and we are not in that group, hide it
      if (itemGroup && currentGroup && itemGroup !== currentGroup) {
        return false;
      }
    }

    if (!item.requiredPermission) return true; // Public items
    const { moduleId, action } = item.requiredPermission;
    return hasPermission(moduleId, action);
  });

  const VALID_SHARED_SCREENS: Record<string, string[]> = {
    "(mandor)": ["bkm", "rawat", "absensi", "profile"],
    "(asisten)": ["bkm", "laporan", "profile"],
    "(admin)": ["master-data", "users", "settings", "profile"],
    "(krani)": ["scan", "timbangan", "profile"],
    "(pemanen)": ["absensi", "profile"],
  };

  const handleMenuPress = (item: MenuItemType) => {
    if (["absensi", "planning", "laporan"].includes(item.id)) {
      Alert.alert("Coming Soon", `Fitur ${item.label} akan segera hadir.`);
      return;
    }
    if (item.route) {
      const itemGroupMatch = item.route.match(/^\(.*?\)/);
      const itemGroup = itemGroupMatch ? itemGroupMatch[0] : null;
      const pathAfterGroup = itemGroup ? item.route.slice(itemGroup.length + 1) : item.route;

      if (itemGroup && itemGroup !== currentGroup) {
        if (!pathAfterGroup) {
          Alert.alert("Info", `Fitur ${item.label} tersedia di menu utama anda.`);
          return;
        }
        const groupScreens = VALID_SHARED_SCREENS[currentGroup];
        if (!groupScreens || !groupScreens.includes(pathAfterGroup)) {
          Alert.alert("Info", `Fitur ${item.label} tidak tersedia di menu ini.`);
          return;
        }
        const resolved = `/${currentGroup}/${pathAfterGroup}` as RelativePathString;
        router.push({ pathname: resolved });
        return;
      }

      router.push({ pathname: item.route as RelativePathString });
    }
  };

  return (
    <View className="px-4 py-2">
      <Text
        className="text-base font-semibold mb-3"
        style={{ color: BrandColors.textPrimary }}
      >
        Daftar Menu
      </Text>
      <View className="flex-row flex-wrap">
        {filteredItems.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            onPress={() => handleMenuPress(item)}
          />
        ))}
      </View>
    </View>
  );
}
