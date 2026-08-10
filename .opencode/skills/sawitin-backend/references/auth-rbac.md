# Auth, RBAC, and Org Scoping

## Login flow (`POST /login/`)

1. Body: `{ username, password }` (public route, no validation schema).
2. Controller bcrypt-compares `user.password_hash` (cost 10). On success:
   - Writes `log_user` entry (action LOGIN).
   - Creates JWT: payload `{ userId, userCode, roles: role[] }`, HS256, `expiresIn: "3d"`, signed with `JWT_SECRET`.
   - Sets cookie `token = "Bearer <jwt>"` (httpOnly, secure in production, sameSite strict) — **but note the cookie
     name mismatch in gotchas: permissionGuard reads `access_token`, so the header is the reliable path.**
   - Returns 200:
     ```json
     {
       "token": "Bearer <jwt>",
       "user": { "id": "...", "username": "...", "member": { ... } },
       "roles": [ ...role objects... ],
       "permissions": [ { "id", "nama", "read", "write", "update", "delete", "select", "approve" } ]
     }
     ```
   - Permissions are merged across the user's roles per mod_app with boolean OR.
3. Failures: `401 { error: "Invalid credentials" }`.

Frontend pattern: store the `token` from the body, send `Authorization: Bearer <token>` on every request.

## How permissionGuard works (`src/middleware/permissionMiddleware.ts`)

Mounted on every route except `/login`, `/logout`, `/modApp`, `/filterOptions`. Pipeline:

1. **Token extraction** — `Authorization: Bearer <jwt>` header, or (broken) `req.cookies.access_token`.
2. **JWT verify** with `JWT_SECRET` → `{ userId, userCode, roles }`. No token → 401; invalid → 401.
3. **Org resolution** — `resolveUserOrgId(userId)`: reads `user.org_id`, falls back to `user.member.org_id`.
   Null → 403. Sets `req.orgId` for controllers (`getRequestOrgId(req)`).
4. **Module mapping** — `routeToModId` converts the URL prefix to `mod_<module>` (e.g. `/bkmPanen` →
   `mod_bkm_panen`, `/staging` → `mod_krani_timbang`, `/custom/roleAndPermissions` → `mod_role`). **Current map
   contents (verified):** `/custom/roleAndPermissions`, `/user`, `/member`, `/role`, `/permission`, `/kelompokLahan`,
   `/lahan`, `/blok`, `/tph`, `/pekerja`, `/tipePekerjaan`, `/grupPekerja`, `/bkmPanen`, `/bkmChecker`, `/bkmRawat`,
   `/kraniTimbang`, `/detailKraniTimbang`, `/material`, `/restan`, `/absensi`, `/planning`, `/laporan`, `/staging`.
   **`/hargaTbs` and `/penjualan` are missing** → every request to them 400s with "Unmapped module" at the guard
   (live bug; see gotchas #8).
5. **Action determination** — `determineAction(method, url)`: GET on one-segment path (list, e.g. `/bkmChecker`) →
   `select`; GET on two-segment path (e.g. `/bkmChecker/:id`) → `read`; POST → `write`; PUT/PATCH → `update`;
   DELETE → `delete`. This runs at the GUARD level, in addition to per-route `checkPermission` — a list GET needs
   `select` (guard) AND `read` (route) unless the route declares no check.
6. **Permission load & cache** — joins `user_role → role → role_permission → permission → mod_app`, ORs flags per
   module, caches in Redis under `permissions:${userId}` with TTL `PERMISSION_CACHE_TTL` (default 1800s).
7. **Denials** — no token → 401 `{ error: "Unauthorized: No token" }`; invalid token → 401; no org →
   `403 { error: "Forbidden: User has no organization" }` (note: controllers later return a different message,
   "User or Organization not found", when `getRequestOrgId` fails); unknown module → 400 `{ error: "Unmapped module
   for <path>" }`; missing permission → 403 `{ error: "Forbidden: Missing <action> permission on <modId>" }`.

### Per-endpoint checks

`checkPermission(modId, action)` gates specific endpoints (approve/reject/special reads). Action vocabulary:
`select`, `read`, `write`, `update`, `delete`, `approve`. In-controller gates use `hasPermission(userId, modId,
action)` (e.g. kraniTimbang update→APPROVED).

### Cache invalidation helpers

- `invalidateUserPermissionCache(userId)` — after user role changes (`updateUser`, `custom/roleAndPermissions`)
- `invalidatePermissionCacheForPermission(permissionId)` — after permission updates
- `invalidatePermissionCacheForRole(roleId)` — after role updates

If you add an endpoint that mutates roles/permissions/users, call the matching invalidation or the Redis cache will
serve stale permissions for up to 1800s.

## Org scoping rules (multi-tenancy)

- **Application-level only** (no RLS despite what `docs/database-schema.md` says).
- Reads: `findFirst({ where: { id, org_id } })` — NOT `findUnique`, so a mismatched org surfaces as 404, not 403.
- Lists: `{ org_id }` merged into the where clause before `applyQueryFilters` whitelisting.
- Writes/updates: org id from `req.orgId`; missing → `403 { error: "User or Organization not found" }`.
- **Global models** (no org scoping — intentional): `role`, `permission`, `mod_app`, `tipe_pekerjaan`,
  `kategori_pekerjaan`, `item_pekerjaan`.
- `user.org_id` is nullable — system admins can have no org; controllers must handle that case.

## Document-level access (lahan PIC gate)

BKM documents tie to a `lahan` whose `user_pic_id` owns it. Controllers check the caller against the lahan PIC:
- If the user IS the PIC (or `user_pic_id` is null) → allowed.
- Else an escape-hatch role list applies, and **the lists differ per controller** (Administrator always; others like
  Mandor Panen / Asisten Afdeling / Manajer Kebun / Krani Timbang vary). Read the controller before assuming.
- Errors: `403 { error: "Forbidden: You are not assigned to this lahan" }` or similar.

## Dual-mode (`PlanType` on organization)

- **PERSONAL**: smallholder. Documents auto-approve, simplified grading, direct sale recording, profit/loss. No
  approval chains.
- **ENTERPRISE**: full RBAC approval chains (Mandor Panen → Mandor 1 → Checker → Krani Timbang → Admin
  reconciliation → payroll/SHP).
- Feature code toggles on `organization.plan_type` — when building a feature, check whether it must behave
  differently per mode (e.g. `bkm_panen.lahan_id` nullable for Personal).

## User context helpers (`src/utils/auth.ts`)

- `getUserFromRequest(req)` — re-verifies the JWT to get `{ userId, userCode, roles }` (used inside controllers).
- `getRequestOrgId(req)` — returns `req.orgId` (set by guard) or 403 error.

## Error handling (`src/middleware/errorHandler.ts`)

| Condition | HTTP | Body |
|---|---|---|
| Prisma P2002 (unique) | 409 | `{ message, error }` |
| Prisma P2003 (FK) | 400 | `{ message, error }` |
| Prisma P2000 (too long) | 400 | `{ message, error }` |
| Prisma P2025 (not found) | 404 | `{ message, error }` |
| Prisma validation error | 400 | `{ message, error }` |
| Other / generic | 500 | `{ message, error }` |
| Zod validation (validateRequest) | 400 | `{ error: [{ field, message }] }` |

Controllers also return their own 4xx `{ error: "..." }` directly for domain failures — these bypass the error
handler. Frontend code should treat `{ error }`, `{ message, error }`, and `{ message }` all as possible failure
shapes (see gotchas).

## Middleware order (`src/index.ts`)

`cors` (ALLOW_ORIGIN) → `cookieParser` → Swagger (`/api-docs`, non-prod) → `queryParser` → `express.json()` →
router (permissionGuard mount) → `errorHandler`.
