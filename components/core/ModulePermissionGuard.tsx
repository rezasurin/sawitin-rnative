import React from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';

export function ModulePermissionGuard({ module, action = 'read', children }: {
  module: string; action?: 'read' | 'write' | 'update' | 'delete' | 'approve'; children: React.ReactNode;
}) {
  const allowed = useAuthStore((state) => state.hasPermission(module, action));
  return allowed ? <>{children}</> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Akses ditolak</Text></View>;
}
