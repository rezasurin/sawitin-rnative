# Phase 7 mobile implementation tasks — field summary

**Sources:** [Report definitions](notes-from-backend/phase-7-report-definitions.md), [production and interval](notes-from-backend/phase-7-production-and-interval.md), [R11 field summary](notes-from-backend/phase-7-quality-weight-restan-summary.md), [productivity and material](notes-from-backend/phase-7-productivity-and-material.md), [R09 approvals and exceptions](notes-from-backend/phase-7-approvals-and-exceptions.md), and [brondol kg correction](notes-from-backend/phase-7-brondol-kg.md), backend contracts dated 23 September 2026.

**Status:** Implemented in code on 25 September 2026; see the [implementation record](phase-7-mobile-implementation.md). Device and live-backend verification remain open. The six Phase 7 notes in this repository cover slices 7.1–7.5 plus the brondol correction; the announced 7.6 data-quality section has no contract here yet.

## Outcome and scope

Put the server's R11 field summary on the Mandor and Asisten home screens. Show the last successful response when offline, with its server generation time. Keep the mobile reporting surface to that summary; R01–R10 tables, filters, CSV export, and the exceptions dashboard belong to the web client. R09 is an optional later mobile approvals list, not a prerequisite for R11.

The existing `components/home/TodaySummary.tsx` counts `SUBMITTED` Panen and Checker documents from the first 100 list rows. Those counts are neither caller-scoped approval counts nor a complete organization total. Replace that Mandor/Asisten card with R11; keep the Krani weighing summary separate. `DashboardScreen` currently has no pull-to-refresh, React Query has no persistent cache, and `types/auth.ts` contains no authoritative farm assignment. `services/sync.service.ts` already posts sync telemetry with a stable SecureStore-backed `device_id` from `services/device.ts`.

## Tasks

### P7-M1 — Add the R11 contract and scoped cache

- [x] Add a typed `GET /laporan/ringkasan` service and hook for `definition`, `generated_at`, `tanggal`, `timezone`, `bjr_used`, optional `kelompok_lahan_id`, separate `approved`/`submitted` production and restan figures, and the `persetujuan` document-type array. Represent nullable measures, including `kg_estimasi_total` and oldest restan age, without converting missing values to zero. Use the server's `tanggal` and `timezone`; do not derive the report date from `utils/estateDate.ts` or send UTC timestamps.
- [x] Fetch only when the user has `mod_laporan.read`. Accept an optional farm ID only from an authoritative user assignment. Because the current auth profile has no such ID, omit `kelompok_lahan_id` until that assignment is supplied; do not infer it from a previously opened document. State on screen that approvals cover the whole organization even when production and restan are farm-filtered.
- [x] Persist the whole last successful response under the authenticated user and filter key, so it survives app restart. Clear or isolate it on logout, account switch, filter change, and a permission loss/`403`; never show one user's figures to another user on a shared device. Do not add R11 to SQLite operational tables or the sync queue.

**Done when:** A successful fetch populates a user-scoped snapshot; an offline restart shows only that user's last response; no snapshot is shown after a `403` or account change; the request has no date range or invented farm filter.

### P7-M2 — Replace the Mandor/Asisten home card with the field summary

- [x] In `components/home/TodaySummary.tsx`, replace `PendingApprovalSummary` for Mandor and Asisten with the R11 view. Show three tiles: today's approved Panen janjang and `kg_estimasi` labelled **kg janjang (estimasi)**, submitted figures labelled **menunggu persetujuan**, open Restan janjang/TPH rows/oldest age with approved and submitted kept distinct, and the sum of `menunggu` plus one row per approvable document type with its oldest age. Show `kg_estimasi_total` separately as **kg total (estimasi, termasuk brondol)** when present. Never add janjang to brondol kg or approved to submitted.
- [x] Render `null` as an em dash, an empty `persetujuan` array as no decisions pending, and `dikembalikan` as returned to the maker rather than pending. Add an R11 definition/version and timezone/BJR footer. Display the server's `tanggal`, including when it differs from the phone's calendar day.
- [x] Show loading, retryable network error with no snapshot, and stale snapshot states. Offline, label the cached response **Data per HH:mm, offline**, derived from `generated_at` in local time; keep the date visible so yesterday's snapshot cannot look current. A `403` hides the card silently. Do not show cached numbers as live while a refresh fails.

**Done when:** The home card uses R11 totals and caller-scoped approvals even with more than 100 source documents; approved/submitted values and estimated kilograms cannot be mistaken for one another; missing and stale data are visibly different from zero and current data.

### P7-M3 — Refresh and permission-aware navigation

- [x] Add pull-to-refresh on `components/home/DashboardScreen.tsx` and refresh R11 when the app returns to the foreground. Avoid background polling and duplicate focus requests. Keep the summary visible while a refresh runs, with a clear refreshing state.
- [x] Gate the home card and any entry point on `mod_laporan.read`; protect deep links if a summary route is introduced. Older organizations may need an administrator to grant the permission even though newer Mandor Panen seeds include it. Handle a server `403` after a stale local grant by hiding and invalidating the snapshot.
- [x] Map each actionable `persetujuan[].dokumen` to an existing, permission-guarded submitted-document list for that role. Pass its status filter and confirm the target screen actually applies it; never send an Asisten to a Mandor-only route. For a document type with no mobile list, show its count without a dead tap target. Keep approval decisions on the existing online-only detail flow.

**Done when:** Pull and foreground refresh update the timestamp; users without reporting permission see no R11 card; each enabled approval link lands on a list the user can read, and unsupported types remain informative but noninteractive.

### P7-M4 — Correct mobile brondol entry and labels

- [x] Audit BKM Panen, Checker, weighing, Restan, trace, detail cards, and `OperationalDraftEditor` for `jumlah_brondol`/`brondol` labels. Use **Brondol (kg)** everywhere, and in the weighing form use **Brondol di truk ini (kg)** for the amount actually loaded on that truck. Make every editable brondol field accept nonnegative whole kilograms and reject decimal input; preserve the distinction between a blank optional value and an entered zero where the contract allows it.
- [x] In `components/krani/TimbanganScreen.tsx`, inspect the current QR/staging payload path before changing it: the UI currently derives brondol from Checker details. Let the krani record the truck's actual brondol and send that value through the existing staging field, while keeping source Checker figures visible for comparison. Do not silently copy the Checker's total into the truck measurement.
- [ ] Verify on a connected device that the truck's entered value appears in weighing detail and trace after staging reconciliation.

**Done when:** Existing whole-kg records still display correctly; a truck can record a different brondol weight from its Checker source; no form accepts fractional brondol or labels kilograms as janjang.

### P7-M5 — Preserve telemetry and defer R09 mobile inbox

- [x] Confirm `POST /sync/telemetry` still fires after every sync attempt and sends the installation-stable `device_id`. Retain the documented in-memory fallback only when SecureStore is unavailable; no R10 exception UI or telemetry payload change is required in mobile.
- [ ] Keep R09 (`GET /laporan/persetujuan?dokumen=...`) as a separate optional task if product work later needs one cross-document mobile inbox. If implemented, it must be online-only with a user-scoped last response stamped from `filters.per`, and it must link only to mobile document details that exist and are permitted. The R11 release must not depend on that screen.

**Done when:** The R11 work does not change queue or telemetry behavior, and R09 is not mistaken for an already required mobile report.

### P7-M6 — Verification and release evidence

- [x] Add focused checks for R11 response mapping, approved/submitted separation, `null` and `kg_estimasi_total`, empty approvals, stale snapshot after restart, account and permission isolation, `403` hiding, refresh triggers, and approval-link routing. Cover brondol whole-kg validation and an actual truck value that differs from Checker. Avoid tests that only repeat the render implementation.
- [x] Run `npm run typecheck`, `npm test`, and `git diff --check` after implementation.
- [ ] On a device connected to the deployed Phase 7 backend, verify an authorized Mandor and Asisten, an older user without `mod_laporan.read`, offline restart, another user's login, app foreground refresh, submitted/approved transitions, and brondol on a weighed truck. Record deployment and device results separately from automated checks.

**Done when:** The mobile behavior matches the R11 and brondol contracts, with live-backend and device results documented. No R01–R10 aggregate table or CSV route is added to this app.

## Dependencies and contract notes

- `/laporan/ringkasan` and `mod_laporan.read` must be deployed and granted to target users. The notes disagree on seed timing: the 7.1/7.2 notes say Mandor Panen lacks the grant; the later 7.3 note says new seeds include it. The client must rely on the actual permission response.
- The report notes link to `docs/operational-reports.md` and `docs/product-decisions.md`, which are absent from this mobile repository. The checked-in Phase 7 handoff notes are the implementation contract here; verify any later backend 7.6 changes before adding fields.
- The web implementation owns R01–R10 report pages, server CSV exports, report date filters and pagination, and the R10 exceptions interface. This mobile plan does not create web tasks in the mobile repository.
