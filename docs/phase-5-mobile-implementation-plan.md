# Phase 5 mobile implementation plan

**Sources:** [Transport trip identity](notes-from-backend/phase-5-transport-trip.md) and [harvest trace and PKS ticket](notes-from-backend/phase-5-trace-and-pks-ticket.md), backend contracts dated 22 September 2026. This plan uses the current mobile routes and the backend schemas/controllers as of 24 September 2026.

**Status:** Implemented in the mobile and backend worktrees on 24 September 2026. See the [implementation record](phase-5-mobile-implementation.md) for verification and open device/deployment checks. The backend Phase 5 checklist remains `READY_FOR_REVIEW`; its phase gate still needs sign-off.

## Outcome and scope

Make one Checker document represent one truck, carry registered vehicle/driver identity into the weighing trip, let a krani photograph and enter the mill ticket next to that weighing, and provide a compact live trace for that trip. The Krani Timbang document **is** the transport trip; no separate trip entity or route is needed. Keep manual plate/name entry available when the fleet is absent or stale offline. Keep sales and Phase 7 reports on their existing paths. The mobile trace is read-only; PDF export and aggregate reports are web work.

Permissions stay with `mod_bkm_checker` for Checker and `mod_krani_timbang` for weighing, PKS tickets, and trace. No ticket approval or new role-editor grant is needed.

## Current mobile baseline and contract gap

- Checker create stores truck and driver text per detail in `components/mandor/BKMCheckerFormStep2.tsx`, `stores/useBkmCheckerStore.ts`, and `types/bkm-checker.ts`. Step 3 queues a compound header/details create. Its current validation accepts different trucks in one document, and the detail/QR screen only shows the first row's truck. `OperationalDraftEditor` also edits the old text fields.
- `kendaraanApi` and `supirApi` already use a per-user read-through cache, delta invalidation, and warmup for users with `mod_krani_timbang.read`. The Phase 4 Rawat lookup also provides active vehicle/driver lists to a Mandor with `mod_bkm_rawat.read`. A Checker-only custom role may have neither source; manual entry must remain usable for that role.
- The Krani QR form in `components/krani/TimbanganScreen.tsx` calls `POST /staging/krani-timbang`, copying the first Checker detail's text. It does **not** call `POST /kraniTimbang`. The current staging schema accepts required `nomor_kendaraan` and `nama_supir` strings, but no `kendaraan_id`, `supir_id`, or `nomor_dokumen`. Direct reconciliation creates a trip without those IDs; later reconciliation links only an exact plate match and never matches a driver by name. Adding fields only to `CreateKraniTimbangPayload` would therefore leave the primary mobile flow unchanged.
- The queue already marks HTTP `409` as a non-retryable conflict and preserves the local payload. It has no `tiket_pks` action. `uploadApi` already supports the `tiket-pks` folder, and observation capture shows how to retain a photo across an offline restart and checkpoint its upload.
- There is no mobile ticket or trace service, type, screen, or navigation entry. The backend provides `GET/POST /tiketPks`, `GET/PUT/DELETE /tiketPks/:id`, ticket history, and `GET /kraniTimbang/:id/trace`.

## Implementation sequence

### 1. Establish typed contracts and close the QR staging gap

1. Add nullable `kendaraan_id`/`supir_id` and populated master objects to Checker detail types; add optional master IDs and `nomor_dokumen` to weighing request types. Preserve existing text snapshots and old queued payloads. Add typed `TiketPks`, create/update payloads, and a trace response model; keep trace decimal strings nullable rather than coercing them to numbers.
2. Make a small backend contract change for `POST /staging/krani-timbang`: accept optional tenant-validated `kendaraan_id`, `supir_id`, and user-entered `nomor_dokumen`; continue to require or derive the matching plate/name text for the QR comparison. Persist those values through both direct reconciliation and pending-log reconciliation, and apply the existing one-truck/source, tenant, and trip-number uniqueness rules. Preserve the existing text-only path and duplicate QR receipt behavior. Confirm the exact response fields for direct and pending submissions before changing mobile navigation. If this backend change is outside the mobile delivery, mark registered identity and trip number on **new QR weighings** as a release dependency; do not send fields that staging silently strips.
3. Confirm the list envelope and filtering for `GET /tiketPks?krani_timbang_id=…`, the mounted permission mapping for ticket CRUD/history and trace, and the canonical ticket photo URL format. Use the backend routes/schemas as the source of truth where the notes omit response details.

**Acceptance:** A selected vehicle and driver remain linked on a direct QR trip and a pending/reconciled trip; a manual-only trip still works; a mismatched source truck or duplicate trip number gets a clear terminal error. Backend tests cover tenant references, both reconciliation paths, and retry of the same QR transaction.

### 2. Put one truck on each Checker document

1. In `BKMCheckerFormStep2` and `Step3`, offer searchable cached vehicle and driver choices with visible **Ketik manual** options. For a selected master, keep its ID and displayed plate/name snapshot; for manual entry, send only the text. Never manufacture an ID from a typed plate or driver name. Warm the same list page the picker requests, use the Rawat lookup when that is the permitted source for Mandor, and fall back to manual when no permitted cache exists.
2. Make the first loaded vehicle the document's displayed truck. Before adding/editing a row or enqueueing, reject a different selected `kendaraan_id`; also warn against a different manual plate or driver/destination on rows intended for the same QR weighing. RESTAN rows with no truck remain valid. Show the chosen truck in the create review, Checker detail header, and SPB summary. Offer **Buat dokumen baru untuk truk lain**, carrying block, TPH, date, and source Panen reference into a fresh draft while leaving the current document and its quantities intact.
3. Pass IDs and text through `types/bkm-checker.ts`, the draft store, online create, queued create, replay, and existing-draft detail editing. Respect `null` as an explicit unlink on updates and omission as no change. Add a focused flow for the backend's one-truck `409`: stop replay, retain the local payload, show the truck already on the server document, and lead to a new Checker document. Do not auto-split or silently retry a partially created document.

**Acceptance:** Offline master selection replays the real ID; manual entry replays only text; two trucks cannot be submitted on one Checker; a server-side `409` remains reviewable after restart; an old text-only queued Checker still replays.

### 3. Carry identity through the weighing form

1. In `TimbanganScreen`, display the Checker truck and driver as the initial choices, with cached master pickers and manual fallback. Require one vehicle representation and one driver representation, while keeping the QR flow's exact Checker text comparison visible. Do not infer a `supir_id` from a name. Add a plain text `nomor_dokumen` field and show it on the weighing detail/history; no local number generator.
2. After the staging contract from step 1 is available, include selected IDs and the entered trip number in `SubmitStagingPayload`. Keep the scanned QR, weights, and source Checker as the current entry path. Map an invalid/deleted foreign key, number conflict, or source-truck mismatch to a specific correction message; do not fall back silently to a text-only submit after an ID error.
3. Update `OperationalDraftEditor` for existing draft trips so it can preserve, set, or clear master links deliberately and edit `nomor_dokumen` without overwriting snapshots by accident. Continue to treat approval decisions as online-only.

**Acceptance:** A registered Checker truck reaches the trip with the same ID; a stale/offline fleet list still permits an explicit manual plate; a truck that disagrees with the source is blocked; an operation without registered vehicles can still weigh fruit.

### 4. Add photo-first PKS ticket capture

1. Add a ticket service and query keys for list/by-trip, create, update, delete, and history. Put **Tiket PKS** on the weighing detail for users with weighing read permission; show the existing ticket or a create action according to write permission. The form starts with camera/gallery capture, then ticket number, mill timestamp, required positive net, optional gross/tare, receiver, and note. Show the fixed trip identity during entry and correction; never provide a move-to-trip control.
2. Validate the three weights together: optional gross/tare are nonnegative, net is positive, and when both are present `abs(gross - tare - net) <= 1 kg`. Send the whole weight group on correction, including deliberate nulls, so partial edits cannot create an inconsistent ticket. Show the tenant-unique ticket-number and one-ticket-per-trip `409` errors separately. Offer delete and refile only as an explicit correction path, with history visible; there is no submit/approve bar.
3. Allow queued **creation for a known server trip ID**. Copy a selected photo into durable app storage, upload to `tiket-pks` on replay, and checkpoint the returned URL before POST. Do not add a fictitious `client_request_id`: on an uncertain result or `409`, fetch the server ticket by trip and compare its ticket number. Treat a matching trip and number as already filed; keep different data or a number used by another trip as a conflict for the user. Keep edit/delete online until a safe replay design exists. A ticket for a weighing still only in staging cannot be queued until that weighing has a server ID.
4. Display stored evidence through an authenticated media fetch, or React Native `Image` with the bearer token header. Handle missing media and expired sessions explicitly; do not rely on a plain public image URL.

**Acceptance:** A photographed ticket created offline survives restart and appears exactly once after sync; replay after a lost POST response resolves to the same trip/number; conflicting tickets stay visible for review; weight mismatch is caught in the form and by the server; history shows create/revise/delete.

### 5. Add a compact, live harvest trace

1. Add a read-only route from the weighing detail and from its ticket card, guarded by `mod_krani_timbang.read`. Fetch `GET /kraniTimbang/:id/trace` only while online, refresh when the screen opens, and show loading, retry, `404`, and access-denied states. Do not put trace data in the offline queue or operational document cache.
2. Show flags first, including an explicit clear state when `flags` is empty. Then present the physical chain: source parcel/TPH/workers and Panen → Checker grading/loading → truck and internal weighing → PKS ticket → sale. Include evidence, approvals, and a compact chronological history. Use authenticated image loading for field and ticket photos.
3. Render janjang, brondol, and kilograms as separate ledgers. Use the server's `quantities.janjang.panen` and grading summaries without summing nested source details. Label `restan_carried_from_earlier` as a subset of weighed fruit, never add it to the weighed total. Show grade `jumlah_janjang`, `breakdown_total`, and `reconciles` side by side, with a warning for false. Render `quantities.berat_kg` decimal strings exactly as returned and `null` as unavailable, never zero.

**Acceptance:** The trace displays every server flag and an empty-flags state, does not double-count a shared Panen or earlier restan, and shows a ticket/sale weight disagreement without choosing one as the truth.

### 6. Finish navigation, permissions, and release evidence

1. Add only the necessary nested ticket/trace routes under Krani and Admin weighing. Update `RoleTabs` hidden routes, Admin menu/quick action where useful, route guards, and detail links. Check deep links against action-level permissions; a read-only user can inspect but cannot create/correct/delete a ticket. Leave the role editor's module list unchanged.
2. Add focused automated checks for picker serialization and old queued Checkers, one-truck local/server conflicts, staging identity and manual fallback, ticket validation and photo checkpoint, ticket duplicate replay, trace counting/display rules, and permission-aware navigation. For queue cases, verify SQLite reopen, connectivity recovery, and user switching. Run `npm run typecheck`, `npm test`, and `git diff --check` after code lands; run focused backend tests for the staging extension in its own repository.
3. On a device with the Phase 5 backend, create two Checker documents for two trucks, scan and weigh one with a registered vehicle and one by manual plate, capture a PKS ticket offline and reconnect, correct its weights, and open the live trace. Verify server IDs, stored photo access, ticket history, trip/source links, and all ledgers. Record deployment and device results separately from automated checks; update the implementation record only with evidence actually obtained.

## Release dependencies and boundaries

- The QR staging endpoint extension in step 1 is required for master IDs and `nomor_dokumen` on **new mobile weighings**. The current direct `/kraniTimbang` contract alone does not cover the app's QR path.
- The backend migrations `20260922240000_transport_trip_identity` and `20260922250000_pks_ticket`, ticket/trace routes, and protected media route must be deployed before live sign-off.
- The current fleet cache covers weighing readers, and the Rawat lookup covers Mandor with Rawat read permission. A Checker-only role gets manual entry unless the backend exposes a permitted fleet lookup for `mod_bkm_checker.read` or its grants are deliberately changed.
- PKS ticket creation has no client request key. Queue replay must use the two server uniqueness rules and a server read to resolve ambiguity; it must never turn every `409` into success.
