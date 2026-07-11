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

export default function AdminLayout() {
  const segments: string[] = useSegments();
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const mainTabs = ["", "(admin)", "index", "master-data", "material", "users", "settings"];
  const hideTabBar = !mainTabs.includes(lastSegment);

  const { hasPermission } = useAuthStore();

  if (!hasPermission('mod_lahan', 'read')) {
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
            title: 'Dashboard',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          }}
        />
        <Tabs.Screen
          name="master-data"
          options={{
            title: 'Master Data',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="database" color={color} />,
          }}
        />
        <Tabs.Screen
          name="material"
          options={{
            title: 'Material',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="cube" color={color} />,
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Pengguna',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Pengaturan',
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
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
