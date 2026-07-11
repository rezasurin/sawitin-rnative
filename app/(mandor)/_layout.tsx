import { DrawerMenu, DrawerOverlay } from "@/components/home";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { BrandColors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  FLOATING_TAB_BAR_STYLE,
  TAB_BAR_ITEM_STYLE,
  TAB_BAR_LABEL_STYLE,
} from "@/constants/navigation";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function MandorLayout() {
  const segments: string[] = useSegments();

  // Hide tab bar on specific nested screens (anything that is not a main tab)
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const mainTabs = ["", "(mandor)", "index", "absensi", "bkm", "checker", "rawat", "profile"];
  const hideTabBar = !mainTabs.includes(lastSegment);

  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_bkm_panen', 'read')) {
    return (
      <View style={styles.container}>
        <Text style={{ color: BrandColors.error, textAlign: 'center', marginTop: 100 }}>Akses ditolak</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: BrandColors.primary,
          tabBarInactiveTintColor: BrandColors.textMuted,
          headerShown: useClientOnlyValue(false, true),
          tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
          tabBarItemStyle: TAB_BAR_ITEM_STYLE,
          tabBarStyle: [
            FLOATING_TAB_BAR_STYLE,
            hideTabBar ? { display: "none" } : {},
          ],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="dashboard" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="absensi"
          options={{
            title: "Absensi",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="calendar-check-o" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bkm"
          options={{
            title: "BKM",
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
          }}
        />
        <Tabs.Screen
          name="checker"
          options={{
            title: "Checker",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="check-circle-o" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="rawat"
          options={{
            title: "Rawat",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="medkit" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
      </Tabs>
      <DrawerOverlay />
      <DrawerMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
