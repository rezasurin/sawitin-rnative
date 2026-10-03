import { ModulePermissionGuard } from '@/components/core/ModulePermissionGuard';
import TiketSpbScreen from '@/components/krani/TiketSpbScreen';
export default function TiketSpbRoute() {
  return <ModulePermissionGuard module="mod_krani_timbang"><TiketSpbScreen /></ModulePermissionGuard>;
}
