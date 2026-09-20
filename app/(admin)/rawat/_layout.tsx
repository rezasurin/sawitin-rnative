import { AdminModuleGuard } from '@/components/core/AdminModuleGuard';
import { Stack } from 'expo-router';

export default function RawatLayout() {
  return (
    <AdminModuleGuard module="rawat">
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
    </Stack>
    </AdminModuleGuard>
  );
}