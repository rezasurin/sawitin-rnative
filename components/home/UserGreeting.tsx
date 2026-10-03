import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.greetingText} numberOfLines={1}>
        {greeting}
      </Text>
      <StatusBadge isOnline={isOnline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
});
