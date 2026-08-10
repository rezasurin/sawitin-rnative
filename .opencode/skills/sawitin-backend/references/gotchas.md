# Gotchas — where docs disagree with code, and per-module quirks

Read this first. These are the traps that waste time. Every item below was verified against
`sawitin/sawitin-backend/src/` source code. **When anything disagrees, trust the code.**

## Docs vs code (the big five)

1. **QR scheme is V2 HMAC, not the SHA-256 truncation in docs.**
   `docs/api-and-security.md` documents an old scheme (SHA-256 hex truncated to 6 chars). The real code
   (`src/utils/qrHandler.ts`) uses format `V2|<checkerId>|<tphId>|<qty>|<ts>|<sig>` where `sig` is the full
   HMAC-SHA256 (base64url) of `V2|<checkerId>|<tphId>|<qty>|<ts>` keyed with `QR_SECRET_KEY`, verified with
   `crypto.timingSafeEqual`. Timestamp window: `-QR_CLOCK_SKEW_MS` (5 min) to `QR_EXPIRY_MS` (48 h).
   `buildUniqueTransactionId` returns `V2|<checkerId>|<tphId>|<qty>|<ts>` — the same string, minus the signature.

2. **Cookie name mismatch — use the Authorization header.**
   `authController.login` sets cookie `token = "Bearer <jwt>"` (httpOnly, sameSite strict) AND returns
   `token: "Bearer <jwt>"` in the body. But `permissionGuard` reads `req.cookies.access_token` and does NOT strip a
   `Bearer ` prefix. So the cookie path is effectively broken; the reliable path is the header.

3. **RLS is aspirational.** `docs/database-schema.md` describes PostgreSQL Row-Level Security with
   `SET LOCAL app.current_org_id`. No code does this. Tenant isolation is purely application-level:
   `org_id` in every where clause (`findFirst({ where: { id, org_id } })`, `{ org_id }` merged into list queries).
   CustomRoleController (`role`, `permission`, `mod_app`, `tipe_pekerjaan`, `kategori_pekerjaan`,
   `item_pekerjaan`) models are intentionally GLOBAL (no org_id).

4. **There is no domain service layer.** Business logic lives in `src/controllers/*Controller.ts` calling Prisma
   directly. Do not look for `services/<domain>`; the only services are `InventoryService`,
   `notificationService`, and legacy `prismaQueryServices` (superseded by `utils/queryHandlers.ts`).

5. **Error envelopes are inconsistent.** Mix of:
   - `{ error: "..." }` — validation (400, from validateRequest: `{ error: [{field, message}] }`), domain errors, and
     auth errors
   - `{ message, error }` — errorHandler 500 responses
   - `{ message }` — logout, changePassword, approveBkmRawat, and ALL responses from customRoleController
     (which uses `{ message }` even for errors like `400 { message: "Role sudah ada" }`)
   - `{ data, meta }` — paginated lists
   - `{ data }` — only `GET /bkmChecker/available-tph` among the "special" endpoints
   - bare arrays — `GET /bkmChecker/ready-for-weighing`, `GET /bkmChecker/ready-to-load`, and ALL
     `GET /<module>/detail` endpoints
   - `204` with no body — all DELETE handlers
   - staging submit: `{ message, reconciled, discrepancy_pct, data }` (201) or `{ message, reconciled: false,
     staging_id, data }` (202)

## Per-module quirks

6. **kraniTimbang permission actions are inconsistent.** PUT `/:id`, PUT `/detail/:id`, and DELETE `/detail/:id` all
   require `checkPermission("mod_krani_timbang", "write")` — not `update`/`delete`. Only parent DELETE `/:id` uses
   `"delete"`.

7. **bkmPanen CRUD has NO per-route permission checks** (only the global auth-level `permissionGuard`). Only
   approve/reject are gated (`checkPermission("mod_bkm_panen", "approve")` — reject also uses the `approve` action,
   there is no `reject` action). Same reject-uses-approve pattern in bkmRawat and kraniTimbang.

8. **hargaTbs and penjualan gate on `mod_keuangan`** via route-level `checkPermission`, not on their own module
   names. **BUT (verified against current code): the mount-level `permissionGuard` has NO `routeToModId` entry for
   `/hargaTbs` or `/penjualan`** (`src/middleware/permissionMiddleware.ts` map ends at `/staging`). Every request to
   those modules therefore dies at the guard with `400 { error: "Unmapped module for /hargaTbs" }` before the
   `mod_keuangan` check is reached. This is a live bug — if you touch finance features, verify whether the map has
   been fixed, and if not, treat the endpoints as currently unreachable (the fix is adding
   `"/hargaTbs": "mod_keuangan"` and `"/penjualan": "mod_keuangan"` to the map).

8b. **Mount-level `determineAction` imposes its own permission on top of the route checks.** The guard maps GET on
    one-segment paths (`/bkmChecker`) → `select`, GET on two-segment paths (`/bkmChecker/:id`) → `read`, POST →
    `write`, PUT/PATCH → `update`, DELETE → `delete`. So a list GET requires BOTH the guard's action (`select`) AND
    the route's `checkPermission(...)` action (`read`). Seeded roles set `select` together with `read`, so this only
    bites for custom roles that grant `read` without `select`.

9. **bkmChecker has no reject endpoint** — rejection is done by PUT with a status transition (SUBMITTED → DRAFT).

10. **approveBkmChecker has side effects:** in a transaction it sets APPROVED, auto-creates `restan` rows for
    details with `tipe_pengiriman === "RESTAN"` (status DRAFT, `sudah_dikirim: false`), then dispatches the
    `reconcile-checker` BullMQ job `{ bkmCheckerId, orgId }` with 3 attempts, exponential backoff 5s.

11. **approveBkmRawat returns `{ message: "BKM Rawat Approved and Inventory Deducted" }` only** (no record), and its
    errors surface as 500 via errorHandler (thrown inside the transaction), unlike other approves which return
    404/400 JSON.

12. **updatePenjualan only sets `modified_by`** — penjualan fields are not editable via PUT.

13. **rejectKraniTimbang prefixes `[REJECTED] ` to `keterangan`** and resets status to DRAFT; rejectBkmPanen and
    rejectBkmRawat also reset to DRAFT (revisi semantics) and set `rejected_by`/`rejected_at`/`rejection_note`.

14. **Status transitions**: `canTransitionStatus` allows client-side only DRAFT→DRAFT|SUBMITTED,
    SUBMITTED→DRAFT|CANCELLED, REVISION_REQUESTED→DRAFT|SUBMITTED for bkm documents; for krani_timbang/penjualan
    SUBMITTED→APPROVED|CANCELLED additionally. APPROVED has no outgoing transitions; REVISION_REQUESTED only via
    approve/reject endpoints. Self-transitions (current === requested) always allowed. See
    `src/utils/statusMachine.ts`.

15. **Two competing list-query engines.** `utils/queryHandlers.ts` `applyQueryFilters` is the active one (strict
    whitelisting). `controllers/baseController.ts` (class method, unused by controllers) and
    `services/prismaQueryServices.ts` are older implementations. When in doubt, read `utils/queryHandlers.ts`.

16. **Detail-list endpoints return bare arrays** (`res.json(details)`) keyed by required `?<parent>_id=` query param:
    `GET /bkmPanen/detail?bkm_panen_id=`, `GET /bkmChecker/detail?bkm_checker_id=`,
    `GET /bkmRawat/detail?bkm_rawat_id=`, `GET /kraniTimbang/detail?krani_timbang_id=`. Missing param → 400.

17. **lahan create returns 200** (not 201) — status-code hygiene is inconsistent across master-data controllers
    (blok/tph/kelompokLahan/pekerja/etc. return 201).

18. **PIC-gate escape hatches differ.** Document controllers check lahan `user_pic_id` ownership. bkmPanen,
    bkmChecker delete, bkmRawat detail delete allow only `Administrator` to escape; bkmChecker byId/update allow
    `["Administrator", "Mandor Panen", "Asisten Afdeling", "Manajer Kebun", "Krani Timbang"]`; lahan access checks
    vary per controller — read the controller before assuming.

19. **Staging duplicate detection:** `POST /staging/krani-timbang` returns `409 { error: "Duplicate transaction",
    message, existing_id }` when `@@unique([org_id, unique_transaction_id])` trips.

20. **modApp and filterOptions are public** (no permissionGuard). modApp is seeded, not CRUD-able via API (routes
    commented out). `GET /filterOptions/:module` supports exactly: member, user, role, lahan, blok, tph, pekerja,
    bkm_panen, bkm_checker, bkm_rawat, krani_timbang, tipe_pekerjaan, grup_pekerja, kelompok_lahan.

21. **bkm_status_log is polymorphic**: exactly one of `bkm_panen_id`/`bkm_checker_id` filled, both nullable.

22. **Route ordering matters**: special routes (`/detail`, `/list`, `/pending`, `/latest`, `/ready-*`,
    `/available-tph`) must be declared before `/:id` or Express captures them — keep this in mind when adding routes.
