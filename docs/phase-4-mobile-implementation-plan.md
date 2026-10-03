# Phase 4 mobile implementation plan

**Sources:** [Agronomy](notes-from-backend/phase-4-agronomy-structure.md), [field observations](notes-from-backend/phase-4-field-observations.md), [stock count](notes-from-backend/phase-4-stock-count.md), [vehicle and fuel](notes-from-backend/phase-4-vehicle-fuel.md), and [consumption metrics](notes-from-backend/phase-4-consumption-metrics.md), backend contracts dated 22 September 2026.

**Status:** Mobile implementation and matching backend lookup adjustment are recorded on 24 September 2026 in the [implementation record](phase-4-mobile-implementation.md). Deployment and device sign-off remain open.

## Outcome and boundaries

Enable field users to record structured Rawat work, observations, and vehicle usage with reliable offline creation. Show stock counts read-only on mobile. Keep consumption metrics on web. Reuse the existing permissions: observations and vehicle usage use `mod_bkm_rawat`, stock counts use `mod_material`, and vehicle/driver masters use `mod_krani_timbang`. No new permission row is needed. Leave weighing's free-text vehicle and driver fields for Phase 5.

## Current mobile baseline

- Rawat already has online and queued create/detail flows in `app/(mandor)/rawat/[id].tsx`, `types/bkm-rawat.ts`, and `services/sync-processor.ts`. The form currently captures workers, result, material, and total quantity, but none of the six new agronomy fields.
- Rawat offline drafts are JSON payloads in `sync_queue`, including their nested `details` and `materials`; there is no separate Rawat draft SQLite table. `services/database.ts` therefore needs **no six-column Rawat migration** for the current storage model. Old queued payloads must remain readable with absent fields treated as null.
- Rawat lookups and work types are user-scoped in `services/bkm-rawat.service.ts` and `services/tipe-pekerjaan.service.ts`; logout clears both lookup tables through `lookupCacheDb.clearAll()`. `TipePekerjaan` does not yet expose `org_id`. There is no mobile work-type editor.
- `app/(admin)/material/add.tsx` is create-only and permits opening stock; `app/(admin)/material/index.tsx` links its cards to `add?id=...`, but that screen does not use the id or edit. There is no working material edit flow. `types/material.ts` still allows `stok` in `UpdateMaterialPayload`; the backend now strips it on update.
- There are no mobile observation, stock-count, vehicle, or driver service/types/routes. `upload.service.ts` already accepts the `observasi` folder, `hooks/useLocation.ts` supplies coordinates, and `types/geometry.ts` defines longitude-first GeoJSON. `services/sync-processor.ts` checkpoints Panen photo uploads; its helper currently hardcodes the Panen folder and an array payload.
- The queue rejects unsupported module/action pairs via `utils/sync-support.ts`. Every new queued action must be added there **and** handled in `processItem`; approve and reject actions must stay online-only.

## Implementation sequence

### 1. Extend existing Rawat capture

1. Add nullable response fields and optional request fields for `luas_ha`, `jumlah_pokok`, `metode`, `kondisi`, material `dosis`, and `satuan_dosis` in `types/bkm-rawat.ts`. Add `bahan_aktif` and `konsentrasi` to material types and to the Rawat lookup material shape if returned there. Add nullable `org_id` to `TipePekerjaan` for correct shared/owned display in any future editor.
2. In the Rawat detail form, add an Agronomi section and dose/unit fields on each material row. Parse area and dose as positive decimals, tree count as a positive integer, and enforce the backend string limits (100/255/50). Empty values stay absent/null; labour-only and road work remain valid. `jumlah` alone determines stock use. Show active ingredient and concentration as read-only product context, never copied onto an application.
3. Carry the fields through local optimistic details, queued header/detail payloads, online create/update, replay, and read-only detail cards. Initialize edits from stored values, including old drafts where fields are missing. Show recorded values only; do not turn missing data into `0` or a placeholder.
4. In the existing admin material create screen, capture `bahan_aktif` and `konsentrasi`. Repair the currently broken `add?id` edit path as a real detail/edit flow so these product fields can be maintained; exclude `stok` from its update schema and payload, and show the current balance read-only with a link to stock counts. Keep the **create-only** opening-stock field, which the backend records as an opening movement. No mobile work-type administration screen is needed for this phase; if one is added later, shared rows (`org_id: null`) must be read-only and a `403` must not be retried.

**Acceptance:** An old queued Rawat replays unchanged; new agronomy/dose values survive online save, offline restart/replay, and subsequent edit. A material's total quantity is deducted once on approval, regardless of dose. No material update sends `stok`.

### 2. Add offline-first field observations

1. Add observation types, API methods, and query hooks for `/observasi` list, detail, create, update, delete, and history. Put list, create, and detail routes beside Rawat for roles with `mod_bkm_rawat` permission. Do not create an Observasi permission. Show audit events (`CREATE`, `REVISE`, `DELETE`) in detail; observations have no status or approval controls.
2. Build one form for all six `jenis` values. Require `kelompok_lahan_id`, date, and observer; make block, land, TPH, measurement, unit, severity, note, photo, and GPS optional. Use one `nilai` field with type-specific label/unit defaults that users can override. Show three large severity choices only for relevant kinds, and remove a stale `tingkat` from the payload when the selected kind hides it. Offer a short rainfall path with the user's kebun prefilled when available.
3. Reuse cached kebun/block pickers and clear dependent location IDs when an ancestor changes. Capture an optional GeoJSON `Point` as `[longitude, latitude]`; lack of GPS must not block saving. Validate nonnegative measurement and note length. Generate a `client_request_id` once per form instance and persist that key with the queued payload. Treat replay responses `200` and `201` as success.
4. Add a standalone `observasi/CREATE` queue action, local pending presentation, and replay branch. Generalize the upload checkpoint helper to handle a single observation photo and the `observasi` folder; persist the uploaded URL before calling `POST /observasi`, so restart/retry reuses it. Preserve the local image until the create succeeds. Keep revision and deletion online in this slice, since the backend note only defines offline create behavior.

**Acceptance:** An observation with and without GPS/photo can be saved offline, survives restart, uploads a photo once per successful checkpoint, and replays to one server record. Wrong block/kebun, reversed coordinates, and reused keys from another user surface clear errors. Rainfall does not send hidden severity.

### 3. Add vehicle, driver, and usage flows

1. Add tenant-scoped vehicle and driver API/types/hooks. Use the existing per-user read-through master cache for their list endpoints, warm the exact page/params the form requests, clear on logout, and invalidate on edits and master-data delta. Use `jenis_kendaraan` to distinguish equipment; do not add a separate equipment model.
2. Add a short vehicle-usage list, create, and detail flow for `mod_bkm_rawat` readers/writers. Required fields are vehicle and date. Offer a registered driver or worker operator, optional same-day/same-kebun Rawat link, one meter pair with editable `km`/`jam`, optional complete fuel pair, and note. Prefill the starting meter from the latest approved end meter only when available; a large jump warns without blocking. Validate end meter ≥ start meter and require both `material_id` and positive `jumlah_bbm` or neither.
3. Add an idempotent `pemakaian_kendaraan/CREATE` queue branch and queued submission. Keep a stable `client_request_id` across online retries and queue replay; replay a returned draft and then submit it if requested. Guard against duplicate submission after an interrupted retry. Do not queue approval/rejection. Online approval, if exposed to a user with the approve grant, must confirm the exact fuel quantity and material, refresh the document and stock on success, and show insufficient-stock failure as an unapplied `SUBMITTED` record.
4. Use vehicle/driver masters as cached pickers; their management screens remain in the web and Phase 5 scope. Vehicle usage navigation depends on `mod_bkm_rawat`, while its pickers depend on `mod_krani_timbang.read`. Confirm field operators have both existing grants, or obtain a backend read-permission adjustment before release; a Rawat-only user cannot use a picker that the backend refuses to serve. Leave weighing's `nomor_kendaraan` and `nama_supir` untouched.

**Acceptance:** Cached masters allow an offline usage draft; no-fuel usage is valid; half-fuel and backwards-meter inputs are blocked before enqueue; create/submit survives restart/replay without duplicate records or fuel movement. Approval cannot enter the queue. A stock-short approval leaves the record submitted.

### 4. Expose stock counts read-only

1. Add stock-count response types and GET list/detail/history methods under `mod_material.read`. Add a discoverable list/detail entry near Material for authorized mobile users, with an approved sheet showing each line's server-owned `stok_sistem`, counted `stok_fisik`, and displayed variance (`stok_fisik - stok_sistem`). Show status and audit history.
2. Do not offer create, edit, submit, or approval in the mobile UI. Do not cache balances as count inputs or infer a target final stock from `stok_fisik`. Explain an adjustment as the signed variance, because approval applies that delta to the **current** balance.

**Acceptance:** An approved count can be inspected on mobile; a count taken before later issues still shows its original system figure and variance. No stock-count mutation can be queued or reached from mobile navigation.

### 5. Close navigation, permissions, and reporting scope

1. Add links and route guards for the new screens in the relevant role trees, quick actions, and admin menu. Verify access against each module's actual read/write/approve grants, including deep links; do not infer access solely from role names. Keep role-editor module lists unchanged.
2. Leave `POST /bkmRawat/metrics` and CSV export to web. Do not add a mobile Laporan route or a partial metrics card. Keep Phase 5 trip assignment and weighing master links outside this phase.
3. Update `docs/README.md` and a Phase 4 implementation record after code lands. Record remaining device/backend checks separately from automated verification.

## Verification and release gate

- Focused checks: Rawat optional-field serialization and old-queue compatibility; observation kind switching, GPS order, photo checkpoint and idempotent replay; vehicle create/submit replay and approval exclusion; per-user vehicle/driver cache; stock-count variance; permission-aware navigation. Test queue behavior with SQLite reopen where restart persistence matters.
- Run `npm run typecheck`, `npm test`, and `git diff --check` after implementation. Avoid counting documentation review as implementation verification.
- On a device with the Phase 4 backend, complete one Rawat activity with area/tree/dose and a material, create a photographed observation offline then reconnect, record and submit a fuel-using vehicle run, and inspect the resulting approved stock count. Verify server record IDs, photo URL, longitude-first coordinates, material movement references, and stock balances. Confirm a user without the relevant grants cannot open the screens through a deep link.
- Confirm backend deployments include migrations `20260922200000_agronomy_structure_and_org_catalog`, `20260922210000_field_observations`, `20260922220000_stock_opname`, and `20260922230000_vehicle_usage`, plus the consumption-metrics service, before live contract testing.

## Contract checks before coding a slice

The notes define behavior but not every response envelope or schema detail. Inspect the deployed OpenAPI/schema or backend source for the exact observation/vehicle list envelope, usage status-update payload, vehicle/driver fields, allowed meter units, observation photo metadata fields, and whether Rawat lookups expose `bahan_aktif`/`konsentrasi`. Confirm the field-role grant combination for the vehicle/driver lookups before building the usage form. Keep the remaining checks within their respective slice; they do not block the Rawat type/form work.
