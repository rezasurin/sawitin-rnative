# API Catalog — every endpoint, its permission, and its response shape

Base URL: backend server, default port 3000. Swagger UI at `/api-docs` (non-production).

## Conventions

- **Mount-level middleware:** all routes except `/login`, `/logout`, `/modApp`, `/filterOptions` are mounted behind
  `permissionGuard` (auth + org resolution; 401/403 if missing token/org).
- **Per-route `checkPermission(mod, action)`** gates specific endpoints. Actions: `select`, `read`, `write`,
  `update`, `delete`, `approve`. (`determineAction` in the guard maps GET list→`select` for `GET /x`... but routes
  mostly set explicit actions — see each entry.)
- **List envelope:** `{ data: [...], meta: { page, limit, total, pages } }` — produced by `applyQueryFilters`
  (utils/queryHandlers.ts). Query params: `page`, `limit` (cap 1000), `sort` (dot-notation), `filters` (JSON or
  `key=value`).
- **Raw record:** single objects returned without wrapper.
- **Bare array:** `res.json(rows)` directly — no wrapper at all.
- **Errors:** `{ error }` (sometimes `{ message, error }` or just `{ message }`). Validation: `400 { error: [{field,
  message}] }`. Deletes: `204` no body.
- **Zod schemas** listed under "validation" live in `src/schemas/` (e.g. `createBkmCheckerSchema`).

Legend for permission column: `auth` = only permissionGuard (no mod/action check); `perm(mod, action)` =
checkPermission; `—` = none at all (public or no middleware).

## Public routes (no auth)

| Method | Path | Validation | Permission | Controller → response |
|---|---|---|---|---|
| POST | `/login/` | none | — | `login` → 200 `{ token: "Bearer <jwt>", user: {id, username, member}, roles: [...], permissions: [{id, nama, read, write, update, delete, select, approve}] }`; 401 `{ error: "Invalid credentials" }`. Sets cookie `token` (see gotchas). |
| GET | `/login/profile` | none | — | `getProfile` → 200 `{ user, roles, permissions }`; 401/404 |
| POST | `/logout/` | none | — | `logout` → 200 `{ message: "Logged out successfully" }` |
| GET | `/modApp/` | none | — | `getAllModApp` → `{ data, meta }` (global, no org) |
| GET | `/modApp/:id` | none | — | `getModAppById` → raw |
| GET | `/filterOptions/` | none | — | `getAvailableModules` → `{ modules: string[] }` |
| GET | `/filterOptions/:module` | none | — | `getFilterOptions` → `{ [field]: { options: [{label, value}], filterKey } }`; 404 if module unconfigured |

## RBAC & identity (`auth` guard only — no per-route checks)

All list endpoints → `{ data, meta }`; byId → raw; create → 201 raw (lahan: 200); update → 200 raw; delete → 204.

| Method | Path | Validation | Notes |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/role/`, `/role/:id` | create/updateRoleSchema | global (no org). update/delete invalidate permission cache |
| GET/POST/PUT/DELETE | `/permission/`, `/permission/:id` | create/updatePermissionSchema | global; update/delete invalidate cache |
| GET/POST/PUT/DELETE | `/user/`, `/user/:id` | create/updateUserSchema | `{ data, meta }` whitelists filters: status, member.nama, roles.some.role.nama; create validates member + role IDs; update replaces roles and invalidates cache |
| POST | `/user/changePassword/:id` | changePasswordSchema | `changePassword` → 200 `{ message: "Password changed successfully" }`; 401 invalid old password |
| GET/POST/PUT/DELETE | `/member/`, `/member/:id` | create/updateMemberSchema | `?available=true` excludes members with a user; `?availablePekerja=true` excludes those with a pekerja |
| GET/POST/PUT/DELETE | `/tipePekerjaan/`, `/tipePekerjaan/:id` | create/updateTipePekerjaanSchema | global |
| POST/PUT | `/custom/roleAndPermissions`, `/custom/roleAndPermissions/:id` | none | composite create/update role+permissions in one transaction; ALL responses `{ message }`-style (errors too); update invalidates cache per affected user |

## Workforce & master data (`auth` guard only)

Standard pattern: list → `{ data, meta }`; byId → raw (with includes); create → 201 raw; update → 200 raw; delete → 204.

| Module | Paths | Validation | Notable response detail |
|---|---|---|---|
| pekerja | `/pekerja/`, `/pekerja/:id` | create/updatePekerjaSchema | includes member, tipe_pekerjaan, grup_pekerja; 400 `{ error: "Invalid tipe pekerjaan IDs provided", invalidTipePekerjaan: [...] }` |
| grupPekerja | `/grupPekerja/`, `/grupPekerja/:id` | create/updateGrupPekerjaSchema | includes mandor→member, blok→lahan→tph; mandor_id FK→user |
| kelompokLahan | `/kelompokLahan/`, `/kelompokLahan/:id` | create/updateKelompokLahanSchema | includes list_blok |
| lahan | `/lahan/`, `/lahan/:id` | create/updateLahanSchema | create returns **200** raw; includes list_tph, blok, member |
| blok | `/blok/`, `/blok/:id` | create/updateBlokSchema | includes list_lahan→list_tph, list_grup |
| tph | `/tph/`, `/tph/:id` | create/updateTphSchema | fields: nama, lahan_id, basis_jjg_perbulan/perhari |
| material | `/material/`, `/material/:id` | **none (no validation!)** | inventory master; `stok` Decimal; used by bkmRawat |

## BKM Panen — harvest documents (`auth` guard; CRUD has no per-route checks)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| GET | `/bkmPanen/` | none | auth | `{ data, meta }` (merges `req.body.filters` oddity), includes lahan/blok/tph/details |
| GET | `/bkmPanen/:id` | none | auth | raw record |
| POST | `/bkmPanen/` | createBkmPanenSchema | auth | 201 raw; 400 "Blok/Lahan not found", "Lahan must belong to the selected blok"; 403 PIC gate (Administrator escapes) |
| PUT | `/bkmPanen/:id` | updateBkmPanenSchema | auth | 200 raw; 403 status transition |
| DELETE | `/bkmPanen/:id` | none | auth | 204 |
| GET | `/bkmPanen/detail` | none | auth | **bare array** — requires `?bkm_panen_id=` (400 if missing) |
| POST | `/bkmPanen/detail` | createBkmPanenDetailSchema | auth | 201 raw; 400 "tph_id is required" / "TPH not found" / "Pekerja not found" |
| PUT | `/bkmPanen/detail/:id` | updateBkmPanenDetailSchema | auth | 200 raw |
| DELETE | `/bkmPanen/detail/:id` | none | auth | 204 |
| POST | `/bkmPanen/:id/approve` | none | **perm(mod_bkm_panen, approve)** | 200 raw (sets APPROVED, approved_by/at, bkm_status_log); 400 "Already Approved" |
| POST | `/bkmPanen/:id/reject` | none | **perm(mod_bkm_panen, approve)** | 200 raw → status DRAFT + rejected_by/at + rejection_note; 400 "Cannot reject approved document" |

## BKM Checker — QC/loading (`auth` + full per-route checks)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| GET | `/bkmChecker/` | none | perm(mod_bkm_checker, read) | `{ data, meta }` |
| GET | `/bkmChecker/ready-for-weighing` | none | perm(..., read) | **bare array** — APPROVED checkers with a LANGSUNG detail, not yet linked to any krani (optional `?id=`) |
| GET | `/bkmChecker/ready-to-load` | none | perm(..., read) | **bare array** — checkers for a date (`?tanggal=`, default today, `?blok_id=`), unlinked |
| GET | `/bkmChecker/available-tph` | none | perm(..., read) | `{ data: details }` — bkm_panen_detail rows from APPROVED panen with tph/pekerja/panen includes (note: `{ data }` wrapper) |
| GET | `/bkmChecker/:id` | none | perm(..., read) | raw (details→pekerja→member); 403 PIC gate (5-role escape list) |
| POST | `/bkmChecker/` | createBkmCheckerSchema | perm(..., write) | 201 raw |
| PUT | `/bkmChecker/:id` | updateBkmCheckerSchema | perm(..., update) | 200 raw; 403 status transition |
| DELETE | `/bkmChecker/:id` | none | perm(..., delete) | 204; PIC gate (Administrator only) |
| GET | `/bkmChecker/detail` | none | perm(..., read) | **bare array** — `?bkm_checker_id=` required |
| POST | `/bkmChecker/detail` | createBkmCheckerDetailSchema | perm(..., write) | 201 raw |
| PUT | `/bkmChecker/detail/:id` | updateBkmCheckerDetailSchema | perm(..., update) | 200 raw |
| DELETE | `/bkmChecker/detail/:id` | none | perm(..., delete) | 204 |
| POST | `/bkmChecker/:id/approve` | none | perm(..., approve) | 200 raw; creates RESTAN rows + dispatches `reconcile-checker` job. **No reject endpoint.** |

## BKM Rawat — maintenance (`auth` + full checks)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| GET | `/bkmRawat/` | none | perm(mod_bkm_rawat, read) | `{ data, meta }` |
| **POST** | `/bkmRawat/list` | none | perm(..., read) | `{ data, meta }` — body `{page, limit, filters}` |
| GET | `/bkmRawat/:id` | none | perm(..., read) | raw |
| POST | `/bkmRawat/` | createBkmRawatSchema | perm(..., write) | 201 raw; nested create of details + materials |
| PUT | `/bkmRawat/:id` | updateBkmRawatSchema | perm(..., update) | 200 raw |
| DELETE | `/bkmRawat/:id` | none | perm(..., delete) | 204 |
| GET | `/bkmRawat/detail` | none | perm(..., read) | **bare array** — `?bkm_rawat_id=` required |
| POST | `/bkmRawat/detail` | createBkmRawatDetailSchema | perm(..., write) | 201 raw; nested-create materials |
| PUT | `/bkmRawat/detail/:id` | updateBkmRawatDetailSchema | perm(..., update) | 200 raw; **deletes + recreates all materials** if `materials` provided |
| DELETE | `/bkmRawat/detail/:id` | none | perm(..., delete) | 204 |
| POST | `/bkmRawat/:id/approve` | none | perm(..., approve) | **200 `{ message: "BKM Rawat Approved and Inventory Deducted" }`** — deducts stock via InventoryService |
| POST | `/bkmRawat/:id/reject` | none | perm(..., approve) | 200 raw → DRAFT + rejection fields |

## Krani Timbang — weighbridge (`auth` + checks; note the `write` quirk)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| GET | `/kraniTimbang/` | none | perm(mod_krani_timbang, read) | `{ data, meta }` |
| GET | `/kraniTimbang/:id` | none | perm(..., read) | raw |
| POST | `/kraniTimbang/` | createKraniTimbangSchema | perm(..., write) | 201 raw; validates TPH + source checkers against org; default `origin_source: MANUAL`, `status: DRAFT` |
| PUT | `/kraniTimbang/:id` | updateKraniTimbangSchema | **perm(..., write)** (not update) | 200 raw; inline `hasPermission(mod_krani_timbang, approve)` check when transitioning to APPROVED; replaces source_checkers |
| DELETE | `/kraniTimbang/:id` | none | perm(..., delete) | 204 |
| GET | `/kraniTimbang/detail` | none | perm(..., read) | **bare array** — `?krani_timbang_id=` required |
| POST | `/kraniTimbang/detail` | createKraniTimbangDetailSchema | perm(..., write) | 201 raw |
| PUT | `/kraniTimbang/detail/:id` | updateKraniTimbangDetailSchema | **perm(..., write)** | 200 raw |
| DELETE | `/kraniTimbang/detail/:id` | none | **perm(..., write)** | 204 |
| POST | `/kraniTimbang/:id/approve` | none | perm(..., approve) | 200 raw |
| POST | `/kraniTimbang/:id/reject` | none | perm(..., approve) | 200 raw → DRAFT + `[REJECTED] ` keterangan prefix |

## Staging — offline sync (`auth` + mod_krani_timbang)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| **POST** | `/staging/krani-timbang` | submitStagingPayloadSchema | perm(mod_krani_timbang, write) | QR payload intake. 201 fast path: `{ message, reconciled: true, discrepancy_pct: "<n.n>", data: kraniTimbang }`; 202 slow path: `{ message: "Payload diterima. Menunggu data Checker untuk rekonsiliasi.", reconciled: false, staging_id, data: pendingLog }`; 400 bad QR/signature/expired/TPH; 403 invalid signature; **409 duplicate transaction**. See references/reconciliation.md |
| GET | `/staging/krani-timbang` | none | perm(..., read) | `{ data, meta }` pending logs |
| GET | `/staging/krani-timbang/:id` | none | perm(..., read) | raw (include krani_timbang) |

## Restan — leftover fruit (`auth` + mod_restan)

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| GET | `/restan/` | none | perm(mod_restan, read) | `{ data, meta }` (queryParser router-wide) |
| GET | `/restan/pending` | none | perm(..., read) | `{ data, meta }` where `sudah_dikirim: false` |
| GET | `/restan/:id` | none | perm(..., read) | raw (include dokumen_kirim, bkm_checker_detail→bkm_checker) |
| POST | `/restan/:id/pickup` | none | perm(mod_restan, **update**) | 200 raw — sets `sudah_dikirim: true`, `tanggal_kirim`, `dokumen_kirim_id`; 400 "Restan sudah terangkut sebelumnya" |

## Finance — harga TBS & penjualan (intended: all gated on `mod_keuangan`)

> **WARNING (verified against current code):** the mount-level `permissionGuard` `routeToModId` map has no entries
> for `/hargaTbs` or `/penjualan`, so every request to these modules currently returns
> `400 { error: "Unmapped module for /hargaTbs" }` before the route handlers run. See `references/gotchas.md` #8.
> The table below documents the intended design (what the route files declare); treat it as live only after the map
> is fixed.

| Method | Path | Validation | Permission | Response / notes |
|---|---|---|---|---|
| **POST** | `/hargaTbs/list` | none | perm(mod_keuangan, read) | `{ data, meta }` (body filters) |
| GET | `/hargaTbs/latest` | none | perm(..., read) | raw latest by tanggal; 404 "No price data found" |
| POST | `/hargaTbs/` | createHargaTbsSchema | perm(..., write) | 201 raw; `@@unique([org_id, tanggal])` |
| PUT | `/hargaTbs/:id` | updateHargaTbsSchema | perm(..., update) | 200 raw. **No GET by id, no DELETE.** |
| **POST** | `/penjualan/list` | none | perm(mod_keuangan, read) | `{ data, meta }` (body filters), includes krani_timbang→detail_timbang, harga_tbs |
| GET | `/penjualan/:id` | none | perm(..., read) | raw |
| POST | `/penjualan/` | createPenjualanSchema | perm(..., write) | 201 raw; computes netto_kebun (from krani.netto), selisih_susut, total_bruto = netto_pabrik × harga, total_potongan = total_bruto × grading_deduction_pct, total_netto. 400 invalid krani/harga |
| PUT | `/penjualan/:id` | updatePenjualanSchema | perm(..., update) | 200 raw — **only sets modified_by** (not editable). **No DELETE.** |

## Query params for list endpoints

Built by `queryParser` middleware into `req.parsedQuery` and consumed by `applyQueryFilters`:
- `page` (default 1), `limit` (default ~10, cap 1000)
- `filters` — JSON string like `{"status":"APPROVED","tanggal":{"gte":"2026-01-01"}}` or repeated `field=value`
- `sort` — dot-notation, e.g. `-tanggal_laporan` (minus = desc)
- Filter/sort fields are whitelisted per module (`allowedFilters`); invalid fields are silently dropped
  (`sanitizeFilters`). Use `GET /filterOptions/:module` to discover valid filter values (status enums, relation
  dropdowns like `list_tipe_pekerjaan.some.tipe_pekerjaan_id`).
