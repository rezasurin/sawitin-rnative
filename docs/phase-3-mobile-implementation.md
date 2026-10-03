# Phase 3 mobile — deferred feature boundary

Implemented 24 September 2026 against [the Phase 3 plan](phase-3-mobile-implementation-plan.md) and [backend note](notes-from-backend/phase-3-deferred.md). This is mobile implementation evidence, not device or product sign-off.

## Delivered

- Planning, work orders, assignment, attendance, and plan-versus-actual remain outside mobile navigation. A regression check covers every role route, visible tab, admin menu, quick action, and dashboard composition while granting all permissions, including the seeded planning and attendance grants. No report placeholder or attendance sync path was added.
- Rawat details now have an optional registered-worker picker backed by the existing user-scoped worker cache. Selecting a worker carries `pekerja_id` through direct API creation, edits, local drafts, queued detail creates/updates, and offline replay. Editing a linked row retains its ID when the worker list is unavailable. Free-text team rows still save without an invented ID. The existing Panen ID path is unchanged.
- New queue items are accepted only for module/action pairs handled by the sync processor. Unsupported attendance or planning work is rejected before SQLite persistence. Any older unsupported row is marked as a validation failure on replay so it reaches the existing recovery flow without repeated network attempts.
- Dormant `AbsensiScreen` code and existing `attendance_records` are retained. A real SQLite reopen check confirms historical local attendance rows survive, with no attendance item created in `sync_queue`. No database migration or backend contract change was needed.

## Automated verification

`npm run typecheck`, `npm test` (77 passing), and `git diff --check` passed. The focused Rawat component checks cover linked online creation, an edit without worker cache, local-draft persistence, queued linked and free-text detail creation, and queued linked edits. Sync tests confirm the linked ID reaches the Rawat replay API. Navigation and queue tests enforce the deferral boundary.

## Device and backend checks still required

1. With a compatible backend, create a linked Rawat detail online and after offline/reconnect. Confirm the persisted `detail_bkm_rawat.pekerja_id` matches the selected worker. Edit an existing linked detail while offline and confirm the ID remains after replay.
2. Save a free-text team detail and confirm it remains unlinked. Restart a device holding old attendance records and confirm they remain on disk while no role exposes an Absensi entry point.
3. Check a role with seeded `mod_planning` and `mod_absensi` grants. Neither grant should reveal deferred navigation.

Future reactivation can add nullable `work_order_id` to the BKM Panen and Rawat header types after the backend publishes that field. Its absence will mean unplanned work; this release needs no client backfill.
