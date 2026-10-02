import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { BrandColors } from '@/constants/Colors';
import { FLOATING_TAB_BAR_STYLE, TAB_BAR_LABEL_STYLE, TAB_BAR_ITEM_STYLE, RoleRouteGroup } from '@/constants/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { TabBarIcon } from './TabBarIcon';

interface Destination {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof TabBarIcon>['name'];
  nested?: boolean;
}

const HOME: Destination = { name: 'index', title: 'Beranda', icon: 'home' };
const ACCOUNT: Destination = { name: 'profile', title: 'Akun', icon: 'user' };
const PANEN: Destination = { name: 'bkm', title: 'BKM Panen', icon: 'book', nested: true };

const ROLE_TABS: Record<RoleRouteGroup, { permission: string; tabs: Destination[]; hidden: string[] }> = {
  '(pemanen)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, ACCOUNT],
    hidden: [],
  },
  '(mandor)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, PANEN, { name: 'checker', title: 'Checker', icon: 'check-circle-o', nested: true }, ACCOUNT],
    hidden: ['rawat', 'observasi', 'pemakaian-kendaraan', 'tutup-harian'],
  },
  '(krani)': {
    permission: 'mod_krani_timbang',
    tabs: [HOME, { name: 'timbangan', title: 'Timbangan', icon: 'balance-scale', nested: true }, ACCOUNT],
    hidden: ['scan'],
  },
  '(asisten)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, PANEN, ACCOUNT],
    hidden: ['observasi', 'pemakaian-kendaraan', 'stock-opname'],
  },
  '(admin)': {
    permission: 'mod_lahan',
    tabs: [HOME, PANEN, { name: 'menu', title: 'Menu', icon: 'th-large' }, ACCOUNT],
    hidden: ['master-data', 'users', 'settings', 'material', 'checker', 'rawat', 'timbangan', 'observasi', 'pemakaian-kendaraan', 'stock-opname'],
  },
};

export function RoleTabs({ group }: { group: RoleRouteGroup }) {
  const segments: string[] = useSegments();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const config = ROLE_TABS[group];
  // Retained root routes also need an exit when opened by an old/deep link.
  const isMainScreen = segments.length <= 2 || (segments.length === 3 && segments[2] === 'index');

  if (!hasPermission(config.permission, 'read')) {
    return <View style={styles.container}><Text style={styles.denied}>Akses ditolak</Text></View>;
  }

  return (
    <Tabs backBehavior={group === '(admin)' ? 'history' : 'firstRoute'} screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: BrandColors.primary,
      tabBarInactiveTintColor: BrandColors.textMuted,
      tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
      tabBarItemStyle: TAB_BAR_ITEM_STYLE,
      tabBarStyle: [FLOATING_TAB_BAR_STYLE, !isMainScreen && { display: 'none' }],
    }}>
      {config.tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarIcon: ({ color }) => <TabBarIcon name={tab.icon} color={color} />,
        }} listeners={tab.nested ? ({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.dispatch(CommonActions.navigate({ name: tab.name, params: { screen: 'index' } }));
          },
        }) : undefined} />
      ))}
      {config.hidden.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  denied: { color: BrandColors.error, textAlign: 'center', marginTop: 100 },
});
