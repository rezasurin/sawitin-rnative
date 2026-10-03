# Phase 4 mobile implementation record

Implemented in the mobile worktree on 24 September 2026 against the [Phase 4 plan](phase-4-mobile-implementation-plan.md). A matching backend lookup change is applied in the separate backend worktree. Deployment and device sign-off remain open.

## Delivered in the mobile app

- Rawat detail capture now carries optional treated area, tree count, method, conditions, dose, and dose unit through online saves, JSON queue drafts, replay, edits, and detail display. Old queue payloads still read with missing values as null. Material create/edit includes active ingredient and concentration; the edit path no longer sends stock. Opening stock remains available only on create.
- One observation form covers all six kinds, with type-specific measurement labels, editable units, optional severity, optional longitude-first GPS, and a rainfall path. A queued create keeps its `client_request_id`, copies a photo to durable app storage, checkpoints the uploaded URL, and removes its local copy after successful replay. List/detail, online correction/deletion, and audit history are available under the Rawat permission.
- Vehicle usage has list, draft form, detail, submit, reopen-after-rejection, online approval/rejection, and audit history. Vehicle/driver lists use per-user read-through caches when permitted. Queued creates/submissions reuse a stable request key; approval and rejection never enter the queue. Fuel is chosen from the cached Rawat material lookup. Weighing fields remain unchanged.
- Stock counts have read-only list/detail/history under Material. The displayed adjustment is `stok_fisik - stok_sistem`; mobile offers no count mutation or approval.
- Mandor, Asisten, and Admin routes and quick actions are permission guarded; Asisten's stock-count view is read-only. Consumption metrics remain web-only; no mobile Laporan screen was added.

## Automated verification

`npm run typecheck`, `npm test` (80 passing), and `git diff --check` passed. Focused tests cover Rawat area/tree/dose persistence in a queued draft, observation photo checkpoint plus stable replay key, and vehicle submission retry after a lost response. Existing tests continue to cover older queue payloads, restart persistence, role navigation, and operational permission boundaries. In the backend worktree, `tsc --noEmit` and the focused agronomy integration test (6 passing) passed against the local test database.

## Backend lookup adjustment applied; deployment required

The backend worktree now returns material `bahan_aktif` and `konsentrasi` from `GET /bkmRawat/lookups`, so Mandor can confirm a product without `mod_material.read`.

The Mandor seed grants `mod_bkm_rawat` but lacks `mod_krani_timbang.read`, while direct `GET /kendaraan` and `GET /supir` require weighing permission. The backend worktree now returns active, tenant-scoped `vehicles[]` and `drivers[]` in the Rawat lookup. The mobile usage form reads those lists for Mandor and retains direct master reads for users with weighing permission. This keeps master management under the weighing module and does not expose weighing records to Mandor.

The backend change touched `src/controllers/bkmRawatController.ts` and `tests/integration/agronomy.integration.test.ts` in the separate backend worktree. No role grant changed. A deployed backend must include this lookup change before Mandor usage and offline master-cache sign-off.

## Device and live-backend checks still required

1. With the backend lookup adjustment deployed, sign in as Mandor, warm caches online, go offline, and record Rawat area/tree/dose, a photographed observation, and a vehicle run. Restart before sync; then reconnect and verify one record per request key, correct photo URL, longitude-first coordinates, dose fields, and submitted usage status.
2. Sign in as an approver, approve fuel usage online, and verify one `OUT` material movement. Retry approval with insufficient stock and confirm the record remains `SUBMITTED` with no partial movement. Check the maker cannot approve their own usage.
3. Inspect an approved stock count after intervening material issues. Confirm the original `stok_sistem` is shown and the UI labels only the signed variance. Check direct links with missing read/write/approve grants.
4. Confirm the Phase 4 migrations and report service are deployed. The mobile app does not exercise `/bkmRawat/metrics`; web owns that sign-off.
