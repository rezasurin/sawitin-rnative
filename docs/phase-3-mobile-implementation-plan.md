# Phase 3 mobile implementation plan — deferred planning and attendance

**Source:** [Phase 3 backend note](notes-from-backend/phase-3-deferred.md), decision dated 22 September 2026.

**Status:** Implemented in the mobile worktree on 24 September 2026. See [implementation evidence](phase-3-mobile-implementation.md). Device and live-backend sign-off remain open.

## Outcome and scope

Keep planning, work orders, assignments, attendance, and plan-versus-actual outside the mobile MVP. There is no new backend endpoint or mobile migration for this phase. The mobile work is to preserve worker identity on operational details and prevent deferred mutations from entering the offline queue. Phase 7 report views named in the backend note are a **web** deliverable; this mobile plan does not add a Laporan route or report placeholders.

## Current mobile baseline

- `components/core/RoleTabs.tsx`, `components/home/QuickActions.tsx`, `constants/adminMenu.ts`, and the `app/` route tree expose no Planning or Absensi entry point. `components/home/DashboardScreen.tsx` has no attendance card. `scripts/check-navigation.cjs` already verifies the visible role tabs and registered routes.
- `components/home/AbsensiScreen.tsx` and `services/database.ts` still contain dormant local attendance code and the `attendance_records` table. They are not routed; retain existing records and schema.
- Panen detail creation and offline replay carry `pekerja_id` through `components/mandor/BKMPanenFormStep4.tsx`, `hooks/useBkmPanen.ts`, and `services/sync-processor.ts`.
- Rawat's detail type accepts `pekerja_id`, but `app/(mandor)/rawat/[id].tsx` currently saves only a free-text worker name and count. Editing a linked detail can therefore omit its existing ID. This is the functional gap to close for Phase 3.
- `stores/useSyncQueueStore.ts` accepts arbitrary module names at enqueue time, while `services/sync-processor.ts` handles a finite set. An accidental attendance producer would create an item the processor cannot drain.

## Implementation sequence

1. **Lock the deferred surface.** Extend `scripts/check-navigation.cjs` (or a focused navigation check) to assert every role remains free of Planning, Work Order, Absensi, and plan-versus-actual routes, tabs, menu actions, dashboard cards, and report placeholders. Check with an authenticated admin as well as field roles: a seeded `mod_planning` or `mod_absensi` permission must not make these features visible. Keep the dormant screen and SQLite records intact. Treat older persona and UI audit documents as historical; the current route tree is the release source of truth.
2. **Preserve Rawat worker identity.** In `app/(mandor)/rawat/[id].tsx`, add an optional registered-worker choice using `usePekerjaList` and the already warmed, user-scoped `pekerja` cache. Show the member name/code when available. Initialize edits from `detail.pekerja_id`; include that ID in online create/update payloads and in local-draft and queued detail payloads. Preserve the existing ID when editing other fields, including when the worker lookup is unavailable offline. Keep free-text team entries valid with no ID; do not invent one from a name. If the user must explicitly unlink or change a linked worker, confirm the backend's accepted update value before adding that action. Keep name and worker count visible so the existing Rawat work record remains usable.
3. **Reject unsupported queue producers before persistence.** At `useSyncQueueStore.addToQueue`, validate module/action pairs against those implemented by `processItem` and return a clear error for unsupported work, including any future attendance or planning producer. Cover all currently supported operational modules so existing offline flows continue. Do not delete or rewrite older queue rows; let existing recovery UI handle any already persisted unsupported item. Do not add an Absensi API call, attendance queue item, or sync processor route.
4. **Record the boundary for later work.** Keep the Phase 3 note and `docs/README.md` aligned with the implemented state. On a future backend reactivation, model nullable `work_order_id` on BKM Panen/Rawat headers; missing means unplanned work. Add a work-order flow only after that contract and route exist. No client-side backfill or migration is part of this phase.

## Verification and completion criteria

- Automated navigation check passes for all five roles, including an admin with `mod_planning` and `mod_absensi` grants. No dormant screen can be reached from the current route tree.
- A queue test rejects unsupported module/action pairs before SQLite insertion and confirms existing Panen, Checker, Rawat, and Krani operations still enqueue and replay. No new attendance row appears in `sync_queue`; existing `attendance_records` remain readable after app restart.
- Rawat tests cover registered-worker create, edit without changing worker, offline local draft, queued detail create/update, restart and replay, and free-text detail. The same `pekerja_id` reaches the server when linked; free-text details remain unlinked. Panen's existing worker ID path remains intact.
- Run `npm run typecheck`, `npm test`, and `git diff --check` after implementation. On a device with a compatible backend, save linked and free-text Rawat details online and after offline/reconnect, then verify the server's `detail_bkm_rawat.pekerja_id`. Check that old local attendance rows survive and there is no Absensi navigation for any role.

The source note links to `docs/product-decisions.md`, which is absent from this mobile repository at planning time. The Phase 3 backend note and current mobile code are the basis for this plan; obtain the product decision record before any later reactivation work.
