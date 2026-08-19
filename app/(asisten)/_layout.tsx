import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { FLOATING_TAB_BAR_STYLE, TAB_BAR_LABEL_STYLE, TAB_BAR_ITEM_STYLE } from '@/constants/navigation';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { DrawerOverlay, DrawerMenu } from '@/components/home';
import { useSegments } from 'expo-router';
import { TabBarIcon } from '@/components/core';

export default function AsistenLayout() {
  const { hasPermission } = useAuthStore();

  const segments: string[] = useSegments();
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const mainTabs = ["", "(asisten)", "index", "bkm", "profile"];
  const hideTabBar = !mainTabs.includes(lastSegment);

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
            hideTabBar ? { display: 'none' } : {},
          ],
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bkm"
          options={{
            title: 'BKM',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
        <Tabs.Screen name="laporan" options={{ href: null }} />
      </Tabs>
      <DrawerOverlay />
      <DrawerMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
