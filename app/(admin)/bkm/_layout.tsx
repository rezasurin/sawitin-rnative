import { AdminModuleGuard } from '@/components/core/AdminModuleGuard';
import { Stack } from 'expo-router';

export default function BkmLayout() {
  return (
    <AdminModuleGuard module="bkm">
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="[id]" />
    </Stack>
    </AdminModuleGuard>
  );
}
