import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
import TiketPksScreen from '@/components/krani/TiketPksScreen';
export default function TicketRoute() {
  return <ModulePermissionGuard module="mod_krani_timbang"><TiketPksScreen /></ModulePermissionGuard>;
}
