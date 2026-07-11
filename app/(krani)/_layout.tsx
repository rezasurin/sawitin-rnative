import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useSegments } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/useAuthStore';
import { FLOATING_TAB_BAR_STYLE, TAB_BAR_LABEL_STYLE, TAB_BAR_ITEM_STYLE } from '@/constants/navigation';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { DrawerOverlay, DrawerMenu } from '@/components/home';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function KraniLayout() {
  const segments: string[] = useSegments();
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const mainTabs = ["", "(krani)", "index", "scan", "timbangan", "profile"];
  const hideTabBar = !mainTabs.includes(lastSegment);

  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_krani_timbang', 'read')) {
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
          name="scan"
          options={{
            title: 'Scan QR',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="qrcode" color={color} />,
          }}
        />
        <Tabs.Screen
          name="timbangan"
          options={{
            title: 'Timbangan',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="balance-scale" color={color} />,
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
      </Tabs>
      <DrawerOverlay />
      <DrawerMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
