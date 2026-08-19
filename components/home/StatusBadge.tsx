import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <View
        style={[styles.dot, { backgroundColor: statusColor }]}
      />
      {showLabel && (
        <Text
          style={[styles.label, { color: statusColor }]}
        >
          {statusText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
