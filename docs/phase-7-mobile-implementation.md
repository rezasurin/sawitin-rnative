# Phase 7 mobile implementation record

**Date:** 25 September 2026  
**Scope:** R11 field summary and brondol kilogram correction from the [implementation tasks](phase-7-mobile-implementation-plan.md).  
**Status:** Code and automated checks complete. Deployment and device checks remain open.

## Delivered code

- `services/field-summary.service.ts`, `types/field-summary.ts`, and `hooks/useFieldSummary.ts` fetch R11 without a date parameter, keep approved and submitted values distinct, and store the whole response in the existing user-scoped lookup cache. A server `403` hides the summary and clears that user's saved R11 responses. The current auth profile has no farm assignment, so the app omits `kelompok_lahan_id`.
- `components/home/TodaySummary.tsx` now shows the server's production, open restan, and caller-scoped approval counts as the first Mandor/Asisten home card. It displays definition/version, report date, timezone, BJR, missing values, and the generation time on stale and offline responses. Panen and Checker approval rows link only to supported, readable submitted lists; other document counts remain visible without a dead link. The Krani home summary remains separate.
- `components/home/DashboardScreen.tsx` adds R11 pull-to-refresh and foreground refresh, with no background polling. `stores/useAuthStore.ts` retains the last authenticated profile in SecureStore so an offline restart can open the user's own cached summary; logout removes it, and a definite authentication rejection does not restore it.
- Panen, Checker, weighing, trace, and draft editing now label brondol as kilograms. Editable fields reject fractional or negative kilograms. Panen's optional blank value remains distinct from an entered zero, including in its SQLite cache. The QR weighing form now requires the krani to enter the actual brondol on that truck and sends it as `jumlah_brondol`; Checker brondol remains visible for comparison.
- Existing sync telemetry continues to post after sync attempts with the SecureStore-backed installation `device_id`. No R09 inbox, R10 exceptions screen, aggregate report table, CSV export, or report queue item was added.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 93 passed, including `scripts/check-phase-7.cjs` checks for R11 cache isolation, permission denial, offline profile restore, approved/submitted display, refresh triggers, approval navigation, whole-kg validation, and a QR weighing whose truck brondol differs from Checker.
- `git diff --check`: passed.
- Review fixes, 25 September 2026: an offline launch keeps the stored access token (only a `401`/`403` clears it), and R11 refreshes once when the device reconnects, without a saved snapshot overwriting a newer response. `scripts/check-phase-7.cjs` covers both.

## Open live checks

- Deploy a backend with `/laporan/ringkasan` and `mod_laporan.read`; verify authorized Mandor and Asisten, a user without the grant, a server `403` after a stale grant, offline restart, a second user on the same device, foreground refresh, and submitted-to-approved transitions.
- On a connected device, weigh a truck with brondol different from Checker, then confirm the staging result, weighing detail, and live trace all show the truck's entered value. This has automated payload coverage but no live reconciliation evidence yet.
- No Android device tooling or booted iOS simulator is available in this workspace (`adb` is absent and `xcrun simctl` is unavailable), so device checks were not run here.
- The Phase 7.6 data-quality contract is not checked into this repository. Any later R11 change needs review against the deployed backend before being treated as covered here.
