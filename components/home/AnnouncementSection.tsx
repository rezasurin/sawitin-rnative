import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BrandColors } from '@/constants/Colors';

/**
 * AnnouncementSection Component
 * Single Responsibility: Display announcements section with toggle visibility
 */
export function AnnouncementSection() {
  const [isVisible, setIsVisible] = useState(true);

  // TODO: Fetch announcements from API
  const announcements: string[] = []; // Empty for now

  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-base font-semibold"
          style={{ color: BrandColors.textPrimary }}
        >
          Pengumuman
        </Text>
        <Pressable
          onPress={() => setIsVisible(!isVisible)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome
            name={isVisible ? 'eye' : 'eye-slash'}
            size={18}
            color={BrandColors.textSecondary}
          />
        </Pressable>
      </View>

      {isVisible && (
        <View
          className="rounded-lg p-4 min-h-24"
          style={{ backgroundColor: BrandColors.cardBg }}
        >
          {announcements.length === 0 ? (
            <Text
              className="text-center text-sm"
              style={{ color: BrandColors.textMuted }}
            >
              Tidak ada pengumuman
            </Text>
          ) : (
            announcements.map((announcement, index) => (
              <Text key={index} style={{ color: BrandColors.textPrimary }}>
                {announcement}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}
