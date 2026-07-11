import React from 'react';
import { View, Text } from 'react-native';
import { BrandColors } from '@/constants/Colors';
import { useUserGreeting } from '@/hooks';
import { useNetworkStatus } from '@/hooks';
import { StatusBadge } from './StatusBadge';

/**
 * UserGreeting Component
 * Single Responsibility: Display user greeting with online/offline status
 */
export function UserGreeting() {
  const { greeting } = useUserGreeting();
  const { isOnline } = useNetworkStatus();

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text
        className="text-lg font-semibold"
        style={{ color: BrandColors.textPrimary }}
      >
        {greeting}
      </Text>
      <StatusBadge isOnline={isOnline} />
    </View>
  );
}
