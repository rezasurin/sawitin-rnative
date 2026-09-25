import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { modulePermission, operationalPolicy, type OperationalModule } from '@/utils/operational-policy';
import type { DocumentStatus } from '@/types/common';

export function useOperationalPolicy(module: OperationalModule, status?: DocumentStatus, detailCount = 0) {
  const { hasPermission } = useAuthStore();
  const online = useNetworkStore((state) => state.isOnline);
  const permission = modulePermission[module];
  return operationalPolicy(status, {
    read: hasPermission(permission, 'read'), write: hasPermission(permission, 'write'),
    update: hasPermission(permission, 'update'), delete: hasPermission(permission, 'delete'),
    approve: hasPermission(permission, 'approve'),
  }, online, detailCount);
}
