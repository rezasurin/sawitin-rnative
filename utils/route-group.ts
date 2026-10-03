import type { RoleRouteGroup } from '@/constants/navigation';
import type { Permission } from '@/types/auth';

type GrantSet = Pick<Permission, 'id' | 'write' | 'approve'>[];

/** Whoever may edit roles can grant themselves anything, so they count as admin. */
export const isAdministrator = (permissions: GrantSet) =>
  permissions.some((p) => p.id === 'mod_role' && p.write);

/**
 * The screens a user opens on, read from what their roles may do rather than
 * from role names, which each organization chooses. Every role a user holds
 * counts, and the first match wins.
 */
export function getRouteGroup(permissions: GrantSet): RoleRouteGroup {
  const can = (id: string, action: 'write' | 'approve') =>
    permissions.some((p) => p.id === id && p[action]);

  if (isAdministrator(permissions)) return '(admin)';
  if (can('mod_bkm_panen', 'approve')) return '(asisten)';
  if (can('mod_bkm_panen', 'write') || can('mod_bkm_rawat', 'write')) return '(mandor)';
  if (can('mod_krani_timbang', 'write')) return '(krani)';
  return '(pemanen)';
}
