# Phase 3 deferred — client impact

**Decision:** 22 September 2026. Planning, work orders, assignment, attendance, and plan-versus-actual are out of the MVP boundary. See [Product decisions](../product-decisions.md).

**Backend contract change:** none. `mod_planning` and `mod_absensi` were already unmounted; no endpoint was added, changed, or removed by this decision.

## Web

- Do not build Planning, Work Order, Attendance, or plan-versus-actual screens. A seeded `mod_planning` / `mod_absensi` grant in the RBAC catalog is not a feature and must not drive navigation.
- Reports: build yield, worker productivity, grading, shrinkage, restan, material, approval, and sync-exception views. Plan-versus-actual and attendance reports are deferred — do not stub them with empty states.

## Mobile

- Dormant Absensi screen code and its local SQLite records stay as-is; leave them unrouted. Do not restore an entry point.
- Do not queue attendance mutations. There is no endpoint to drain them to, and a queued item with no route is a dead-letter the sync processor cannot classify.
- Worker identity stays where it already is: `pekerja_id` on `bkm_panen_detail` and on `detail_bkm_rawat`. Keep sending it — it is the payroll input that survives the deferral.

## On reactivation

Work orders arrive as a nullable `work_order_id` on the BKM Panen and BKM Rawat headers. Clients should treat an absent value as unplanned work, so no client-side migration is needed when it lands.
