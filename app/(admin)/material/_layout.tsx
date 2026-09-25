import { Stack } from 'expo-router';
import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';

export default function MaterialLayout() {
  return (
    <ModulePermissionGuard module="mod_material"><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
    </Stack></ModulePermissionGuard>
  );
}
