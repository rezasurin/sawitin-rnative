import React from 'react';
import { View, Text, Pressable } from 'react-native';
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
      className="flex-row items-center justify-between px-4 pb-4"
      style={{
        backgroundColor: BrandColors.primary,
        paddingTop: insets.top + 12,
      }}
    >
      <Text className="text-white text-2xl font-bold">SAWITIN</Text>
      <Pressable
        onPress={openDrawer}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="p-2"
      >
        <FontAwesome name="bars" size={24} color={BrandColors.white} />
      </Pressable>
    </View>
  );
}
