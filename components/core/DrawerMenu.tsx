import { BrandColors } from "@/constants/Colors";
import { useQueryClient } from "@tanstack/react-query";
import { useNetworkStatus, useSync } from "@/hooks";
import { useDrawerStore } from "@/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, useSegments } from "expo-router";
import { DrawerMenuItem } from "@/types/home";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "../home/StatusBadge";
import { formatSyncResult } from "@/services/sync.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

/**
 * DrawerMenu Component
 * Single Responsibility: Display side drawer with user profile and menu items
 */

const MENU_ITEMS: DrawerMenuItem[] = [
  { id: "refresh", label: "Perbarui data", icon: "refresh" },
  { id: "sync", label: "Sinkronkan data", icon: "cloud-download" },
  // { id: "history", label: "Riwayat respon", icon: "history" },
  // { id: "team", label: "Kelola tim", icon: "users" },
  { id: "settings", label: "Pengaturan", icon: "cog" },
  { id: "help", label: "Bantuan", icon: "question-circle" },
];

export function DrawerMenu() {
  const insets = useSafeAreaInsets();
  const { isOpen, closeDrawer } = useDrawerStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isOnline, connectionLabel } = useNetworkStatus();
  const queryClient = useQueryClient();
  const router = useRouter();
  const segments = useSegments();
  const currentGroup = segments[0] || "";
  const { triggerSync, syncPhase, syncDetail, pendingCount } = useSync();
  const isSyncing = syncPhase === "pushing" || syncPhase === "pulling";

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(isOpen ? 0 : DRAWER_WIDTH, { duration: 250 }),
        },
      ],
    };
  }, [isOpen]);

  const displayName = user?.member?.nama || user?.username || "User";
  const phone = "+62 88828288288"; // TODO: Get from user profile
  const groupCode = "Kel. B20"; // TODO: Get from user profile

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "Tidak ada koneksi",
        "Sinkronisasi membutuhkan koneksi internet. Silakan coba lagi saat online.",
      );
      return;
    }
    if (isSyncing) return;

    const result = await triggerSync();
    Alert.alert(
      result.pushFailed > 0 ? "Sinkronisasi Sebagian" : "Sinkronisasi Berhasil",
      formatSyncResult(result),
    );
  };

  const handleMenuPress = (item: DrawerMenuItem) => {
    switch (item.id) {
      case "refresh":
        closeDrawer();
        queryClient.invalidateQueries();
        break;
      case "sync":
        handleSync();
        break;
      case "settings":
        closeDrawer();
        router.push(
          `/${currentGroup}/${currentGroup === "(admin)" ? "settings" : "profile"}` as any,
        );
        break;
      case "help":
        closeDrawer();
        Alert.alert("Bantuan", "Hubungi admin untuk bantuan lebih lanjut.");
        break;
    }
  };

  const handleLogout = async () => {
    closeDrawer();
    await logout();
  };

  return (
    <Animated.View style={[styles.drawer, animatedStyle]}>
      {/* User Profile Card */}
      <View
        style={[
          styles.profileCard,
          {
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <FontAwesome name="user" size={22} color={BrandColors.white} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              <FontAwesome name="pencil" size={12} color={BrandColors.white} />
            </View>
            <Text style={styles.phoneText} numberOfLines={1}>
              {phone}
            </Text>
            <View style={styles.statusRow}>
              <StatusBadge isOnline={isOnline} showLabel={false} />
              <Text style={styles.statusText}>
                {isOnline ? `Online - ${connectionLabel}` : "Offline"}
              </Text>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{groupCode}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item) => {
          const isSyncItem = item.id === "sync";
          const isDisabled = isSyncItem && isSyncing;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                pressed && styles.menuItemPressed,
                isDisabled && styles.menuItemDisabled,
              ]}
              disabled={isDisabled}
              onPress={() => handleMenuPress(item)}
            >
              <View style={styles.menuItemRow}>
                <View style={styles.menuIconContainer}>
                  {isSyncItem && isSyncing ? (
                    <ActivityIndicator size={20} color={BrandColors.primary} />
                  ) : (
                    <FontAwesome
                      name={item.icon as any}
                      size={20}
                      color={BrandColors.textSecondary}
                    />
                  )}
                </View>
                <Text style={styles.menuItemLabel}>
                  {isSyncItem && isSyncing ? syncDetail : item.label}
                </Text>
                {/* Pending count badge */}
                {isSyncItem && pendingCount > 0 && !isSyncing && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Logout Button */}
      <Pressable
        style={({ pressed }) => [pressed && styles.menuItemPressed]}
        onPress={handleLogout}
      >
        <View style={[styles.logoutRow, { paddingBottom: insets.bottom }]}>
          <View style={styles.menuIconContainer}>
            <FontAwesome name="sign-out" size={20} color={BrandColors.error} />
          </View>
          <Text style={styles.logoutText}>Keluar</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: BrandColors.drawerBg,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  profileCard: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  phoneText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 12,
    fontWeight: "500",
  },
  groupBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  groupBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemPressed: {
    backgroundColor: "#F3F4F6",
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: BrandColors.textPrimary,
    flex: 1,
  },
  badgeContainer: {
    backgroundColor: BrandColors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.error,
  },
});
