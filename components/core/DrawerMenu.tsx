import { BrandColors } from "@/constants/Colors";
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from "@/hooks";
import { useDrawerStore } from "@/stores";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, useSegments } from 'expo-router';
import { DrawerMenuItem } from "@/types/home";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "../home/StatusBadge";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

/**
 * DrawerMenu Component
 * Single Responsibility: Display side drawer with user profile and menu items
 */

const MENU_ITEMS: DrawerMenuItem[] = [
  { id: "refresh", label: "Perbarui data", icon: "refresh" },
  { id: "sync", label: "Sinkronkan data", icon: "cloud-download" },
  { id: "history", label: "Riwayat respon", icon: "history" },
  { id: "team", label: "Kelola tim", icon: "users" },
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

  const handleMenuPress = (item: DrawerMenuItem) => {
    closeDrawer();
    switch (item.id) {
      case "refresh":
        queryClient.invalidateQueries();
        break;
      case "sync":
        router.push("/(krani)" as any);
        break;
      case "history":
        Alert.alert("Coming Soon", "Riwayat respon akan segera hadir.");
        break;
      case "team":
        Alert.alert("Coming Soon", "Kelola tim akan segera hadir.");
        break;
      case "settings":
        router.push(`/${currentGroup}/${currentGroup === "(admin)" ? "settings" : "profile"}` as any);
        break;
      case "help":
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
        className="px-4 pb-4"
        style={{
          backgroundColor: BrandColors.primary,
          paddingTop: insets.top + 12,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
            <FontAwesome name="user" size={24} color={BrandColors.white} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-lg">
                {displayName}
              </Text>
              <FontAwesome name="pencil" size={12} color={BrandColors.white} />
              <Text className="text-white/80 text-xs ml-auto">{groupCode}</Text>
            </View>
            <Text className="text-white/80 text-sm">{phone}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <StatusBadge
                isOnline={isOnline}
                label={isOnline ? `Online - ${connectionLabel}` : "Offline"}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="flex-1 py-2">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            className="flex-row items-center gap-4 px-4 py-3 active:bg-gray-100"
            onPress={() => handleMenuPress(item)}
          >
            <FontAwesome
              name={item.icon as any}
              size={20}
              color={BrandColors.textSecondary}
            />
            <Text
              className="text-base"
              style={{ color: BrandColors.textPrimary }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Logout Button */}
      <Pressable
        className="flex-row items-center gap-4 px-4 py-4 border-t border-gray-200 active:bg-gray-100"
        style={{ paddingBottom: insets.bottom + 16 }}
        onPress={handleLogout}
      >
        <FontAwesome name="sign-out" size={20} color={BrandColors.error} />
        <Text className="text-base" style={{ color: BrandColors.error }}>
          Keluar
        </Text>
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
});
