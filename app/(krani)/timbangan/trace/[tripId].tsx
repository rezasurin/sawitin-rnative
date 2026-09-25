import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
import HarvestTraceScreen from '@/components/krani/HarvestTraceScreen';
export default function TraceRoute() {
  return <ModulePermissionGuard module="mod_krani_timbang"><HarvestTraceScreen /></ModulePermissionGuard>;
}
