import React from 'react';
import { View, Text } from 'react-native';
import { BrandColors } from '@/constants/Colors';
import { Task } from '@/types/home';

/**
 * TodayTasksList Component
 * Single Responsibility: Display today's tasks list with empty state
 */
export function TodayTasksList() {
  // TODO: Fetch today's tasks from API
  const tasks: Task[] = []; // Empty for now

  return (
    <View className="px-4 py-3 flex-1">
      <Text
        className="text-base font-semibold mb-3"
        style={{ color: BrandColors.textPrimary }}
      >
        Daftar Tugas Hari Ini
      </Text>

      <View className="flex-1">
        {tasks.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <Text
              className="text-sm"
              style={{ color: BrandColors.textMuted }}
            >
              Belum ada tugas hari ini!
            </Text>
          </View>
        ) : (
          tasks.map((task) => (
            <View
              key={task.id}
              className="p-3 mb-2 rounded-lg"
              style={{ backgroundColor: BrandColors.cardBg }}
            >
              <Text style={{ color: BrandColors.textPrimary }}>
                {task.title}
              </Text>
              {task.description && (
                <Text
                  className="text-sm mt-1"
                  style={{ color: BrandColors.textSecondary }}
                >
                  {task.description}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
