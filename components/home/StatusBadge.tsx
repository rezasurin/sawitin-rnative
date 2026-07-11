import React from 'react';
import { View, Text } from 'react-native';
import { BrandColors } from '@/constants/Colors';

/**
 * StatusBadge Component
 * Single Responsibility: Display online/offline status indicator
 */
interface StatusBadgeProps {
  isOnline: boolean;
  label?: string;
  showLabel?: boolean;
}

export function StatusBadge({ isOnline, label, showLabel = true }: StatusBadgeProps) {
  const statusColor = isOnline ? BrandColors.online : BrandColors.offline;
  const statusText = label || (isOnline ? 'Online' : 'Offline');

  return (
    <View className="flex-row items-center gap-1">
      <View
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      {showLabel && (
        <Text
          className="text-xs"
          style={{ color: statusColor }}
        >
          {statusText}
        </Text>
      )}
    </View>
  );
}
