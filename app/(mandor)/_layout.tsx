import { DrawerMenu, DrawerOverlay } from "@/components/home";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { BrandColors } from "@/constants/Colors";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  FLOATING_TAB_BAR_STYLE,
  TAB_BAR_ITEM_STYLE,
  TAB_BAR_LABEL_STYLE,
} from "@/constants/navigation";
import { TabBarIcon } from "@/components/core";
import { Tabs, useSegments } from "expo-router";
import { CommonActions } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function MandorLayout() {
  const segments: string[] = useSegments();

  // Hide tab bar on specific nested screens (anything that is not a main tab)
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const mainTabs = ["", "(mandor)", "index", "bkm", "checker", "profile"];
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
          name="bkm"
          options={{
            title: "BKM",
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'bkm',
                  params: { screen: 'index' },
                })
              );
            },
          })}
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'checker',
                  params: { screen: 'index' },
                })
              );
            },
          })}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
        <Tabs.Screen name="absensi" options={{ href: null }} />
        <Tabs.Screen name="rawat" options={{ href: null }} />
      </Tabs>
      <DrawerOverlay />
      <DrawerMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
