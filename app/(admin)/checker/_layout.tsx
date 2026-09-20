import { AdminModuleGuard } from '@/components/core/AdminModuleGuard';
import { Stack } from 'expo-router';
import React from 'react';

export default function CheckerLayout() {
  return (
    <AdminModuleGuard module="checker">
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
    </Stack>
    </AdminModuleGuard>
  );
}
