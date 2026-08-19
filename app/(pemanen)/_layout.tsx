import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { FLOATING_TAB_BAR_STYLE, TAB_BAR_LABEL_STYLE, TAB_BAR_ITEM_STYLE } from '@/constants/navigation';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { DrawerOverlay, DrawerMenu } from '@/components/home';
import { TabBarIcon } from '@/components/core';

export default function PemanenLayout() {
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
          tabBarStyle: FLOATING_TAB_BAR_STYLE,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Beranda',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
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
        <Tabs.Screen name="absensi" options={{ href: null }} />
      </Tabs>
      <DrawerOverlay />
      <DrawerMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
