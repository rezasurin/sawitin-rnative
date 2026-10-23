import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs, router, useSegments } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { BrandColors } from '@/constants/Colors';
import { FLOATING_TAB_BAR_STYLE, TAB_BAR_LABEL_STYLE, TAB_BAR_ITEM_STYLE, RoleRouteGroup } from '@/constants/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { getRouteGroup } from '@/utils/route-group';
import { Button } from './Button';
import { TabBarIcon } from './TabBarIcon';

interface Destination {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof TabBarIcon>['name'];
  nested?: boolean;
  /** Read on this module shows the tab; without it the tab is hidden, not a dead end. */
  permission?: string;
}

const HOME: Destination = { name: 'index', title: 'Beranda', icon: 'home' };
const ACCOUNT: Destination = { name: 'profile', title: 'Akun', icon: 'user' };
const PANEN: Destination = { name: 'bkm', title: 'BKM Panen', icon: 'book', nested: true, permission: 'mod_bkm_panen' };

const ROLE_TABS: Record<RoleRouteGroup, { permission: string; tabs: Destination[]; hidden: string[] }> = {
  '(pemanen)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, ACCOUNT],
    hidden: [],
  },
  '(mandor)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, PANEN, { name: 'checker', title: 'Checker', icon: 'check-circle-o', nested: true, permission: 'mod_bkm_checker' }, ACCOUNT],
    hidden: ['rawat', 'observasi', 'pemakaian-kendaraan', 'tutup-harian'],
  },
  '(krani)': {
    permission: 'mod_krani_timbang',
    tabs: [HOME, { name: 'timbangan', title: 'Timbangan', icon: 'balance-scale', nested: true, permission: 'mod_krani_timbang' }, ACCOUNT],
    hidden: ['scan'],
  },
  '(asisten)': {
    permission: 'mod_bkm_panen',
    tabs: [HOME, PANEN, ACCOUNT],
    hidden: ['observasi', 'pemakaian-kendaraan', 'stock-opname', 'tutup-harian'],
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
  const permissions = useAuthStore((state) => state.permissions);
  const config = ROLE_TABS[group];
  // Retained root routes also need an exit when opened by an old/deep link.
  const isMainScreen = segments.length <= 2 || (segments.length === 3 && segments[2] === 'index');
  // The group the user was routed to always opens: a Mandor with only BKM Rawat, or a
  // user with no write at all, must still reach Beranda and Akun to sign out.
  const home = getRouteGroup(permissions);

  if (group !== home && !hasPermission(config.permission, 'read')) {
    return <View style={styles.container}>
      <Text style={styles.denied}>Akses ditolak</Text>
      <Button title="Kembali ke Beranda" onPress={() => router.replace(`/${home}` as never)} style={styles.back} />
    </View>;
  }
  const tabs = config.tabs.filter((tab) => !tab.permission || hasPermission(tab.permission, 'read'));
  const hidden = [...config.tabs.filter((tab) => !tabs.includes(tab)).map((tab) => tab.name), ...config.hidden];

  return (
    <Tabs backBehavior={group === '(admin)' ? 'history' : 'firstRoute'} screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: BrandColors.primary,
      tabBarInactiveTintColor: BrandColors.textMuted,
      tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
      tabBarItemStyle: TAB_BAR_ITEM_STYLE,
      tabBarStyle: [FLOATING_TAB_BAR_STYLE, !isMainScreen && { display: 'none' }],
    }}>
      {tabs.map((tab) => (
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
      {hidden.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  denied: { color: BrandColors.error, textAlign: 'center', marginTop: 100 },
  back: { marginTop: 24, marginHorizontal: 24 },
});
