import React from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandColors } from '@/constants/Colors';
import { MenuItem as MenuItemType } from '@/types/home';

/**
 * MenuItem Component
 * Single Responsibility: Display individual menu item with icon and label
 */
interface MenuItemProps {
  item: MenuItemType;
  onPress?: () => void;
}

export function MenuItem({ item, onPress }: MenuItemProps) {
  return (
    <Pressable
      className="items-center justify-center p-2"
      onPress={onPress}
      style={{ width: '25%' }}
    >
      <View
        className="w-14 h-14 rounded-lg items-center justify-center mb-2"
        style={{ backgroundColor: BrandColors.menuItemBg }}
      >
        <FontAwesome
          name={item.icon as any}
          size={24}
          color={BrandColors.textSecondary}
        />
      </View>
      <Text
        className="text-xs text-center"
        style={{ color: BrandColors.textPrimary }}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
