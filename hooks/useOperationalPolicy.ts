import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { makerCheckerModules, modulePermission, operationalPolicy, type OperationalModule } from '@/utils/operational-policy';
import type { DocumentStatus } from '@/types/common';

export function useOperationalPolicy(module: OperationalModule, status?: DocumentStatus, detailCount = 0, createdBy?: string | null) {
  const { hasPermission, user } = useAuthStore();
  const online = useNetworkStore((state) => state.isOnline);
  const permission = modulePermission[module];
  return operationalPolicy(status, {
    read: hasPermission(permission, 'read'), write: hasPermission(permission, 'write'),
    update: hasPermission(permission, 'update'), delete: hasPermission(permission, 'delete'),
    approve: hasPermission(permission, 'approve'),
  }, online, detailCount,
    makerCheckerModules.includes(module) && !!user?.user_code && createdBy === user.user_code);
}
