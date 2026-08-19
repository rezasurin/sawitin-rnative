import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandColors } from '@/constants/Colors';
import { useDrawerStore } from '@/stores';

/**
 * HomeHeader Component
 * Single Responsibility: Display app header with title and menu button
 */
export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: BrandColors.primary,
          paddingTop: insets.top + 12,
        },
      ]}
    >
      <Text style={styles.title}>SAWITIN</Text>
      <Pressable
        onPress={openDrawer}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.menuButton}
      >
        <FontAwesome name="bars" size={24} color={BrandColors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  menuButton: {
    padding: 8,
  },
});
