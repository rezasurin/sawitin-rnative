# Role names no longer decide behaviour

Organizations name their own roles, so nothing in backend, web or mobile may branch on a role's
`nama`. Every rule that used to is now a permission.

| Rule | Before | Now |
| --- | --- | --- |
| Work on a lahan you are not PIC of (BKM Panen, Checker, Rawat, header and detail) | Panen: `Administrator` only. Checker/Rawat: five role names | `mod_semua_lahan` read |
| Lahan with no PIC | Header routes refused it unless privileged; detail routes allowed it | Allowed everywhere; the route's module permission decides |
| Revision alert recipients | Roles named Asisten Afdeling, Manajer Kebun, Administrator | Users with `approve` on the document's module |
| Admin (web admin-only pages, mobile permission bypass) | Role named `Administrator` | `write` on `mod_role` |
| Mobile home screens | Name of the first role | Permissions across all roles: `mod_role` write → admin, `mod_bkm_panen` approve → asisten, `mod_bkm_panen`/`mod_bkm_rawat` write → mandor, `mod_krani_timbang` write → krani, else pemanen |
| Grup Pekerja mandor | Any user | `write` on `mod_bkm_panen` or `mod_bkm_rawat` (`GET /user?mandor=true`) |

## Migration `20261002100000_all_lahan_grant`

Adds `mod_app` row `mod_semua_lahan` ("Akses Semua Lahan") and grants it read to every role named
Administrator, Mandor Panen, Asisten Afdeling, Manajer Kebun or Krani Timbang, in every
organization. A role with any other name gets nothing, as before. To keep a Mandor to their own
lahan, untick the grant on that role in role administration.

Behaviour change: the four non-admin roles above can now also open and change BKM Panen on lahan
they are not PIC of. Before, only Administrator could.

## Clients

- Web: `isAdministrator(permissions)` in `lib/permissions.ts`; role templates carry
  `mod_semua_lahan` for Administrator, Manajer Kebun, Asisten Afdeling, Mandor Panen, Mandor Rawat
  and Krani Timbang. The permission screen lists the new module from `/modApp` with no change.
- Mobile: `utils/route-group.ts` (`getRouteGroup`, `isAdministrator`). No API change; it reads the
  `permissions` array login already returns.
