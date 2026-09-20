# Krani Timbang (mobile) — user flow & UI/UX audit — 15 September 2026

Static source review of the mobile weighbridge surface, the backend endpoints it calls, and the reconciliation
contract they are supposed to implement. **No device or emulator walkthrough was performed**; every touch-target,
contrast and navigation claim below is derived from source. Items that need a device to confirm are in §7.

This continues the 15 September series: `checker-audit-2026-09-15.md`, `bkm-panen-audit-2026-09-15.md`,
`bkm-rawat-audit-2026-09-15.md`, `offline-sync-audit-2026-09-15.md`, `ui-ux-audit-2026-09-15.md`. Findings that are
the Krani-side face of a defect already recorded there are cross-referenced, not re-argued.

Audited surfaces:

| Surface | Files |
| --- | --- |
| History | `app/(krani)/timbangan/index.tsx`, `components/krani/KraniTimbangHistory.tsx` |
| Scanner | `app/(krani)/timbangan/scan.tsx`, `app/(krani)/scan.tsx` (legacy redirect), `utils/qr.ts` |
| Input + detail | `app/(krani)/timbangan/add.tsx`, `app/(krani)/timbangan/[detailId].tsx`, `components/krani/TimbanganScreen.tsx` |
| Dashboard | `app/(krani)/index.tsx` → `components/home/DashboardScreen.tsx`, `components/home/TodaySummary.tsx` (`KraniTodaySummary`), `components/home/QuickActions.tsx` |
| Admin surface | `app/(admin)/timbangan/*` — 1-line re-exports of the krani screens, gated by `AdminModuleGuard` |
| State & data | `hooks/useKraniTimbang.ts`, `services/krani-timbang.service.ts`, `types/krani-timbang.ts`, `stores/useKraniTimbangStore.ts` (unused), `services/staging.service.ts` (unused), `types/staging.ts` |
| Backend contract | `kraniTimbangController.ts`, `kraniTimbangRoute.ts`, `stagingController.ts`, `ReconciliationService.ts`, `qrHandler.ts`, `prisma/schema.prisma`, `prisma/seeder/roleSeeder.ts` |

**Typecheck at audit time:** `node node_modules/typescript/bin/tsc --noEmit` → exit 0.
**Structural checks at audit time:** `node --test scripts/check-audit.cjs scripts/check-navigation.cjs` → 12 passing,
including "Krani scan, input and detail share the Timbangan stack" and "Permission guard remains active".

## 1. Flow as implemented

```
Krani tab "Timbangan" ─┐
Dashboard "Timbangan Hari Ini" ─┘
        │
        ├─ history: GET /kraniTimbang?page=1&limit=100&sort=created_at:desc
        │          filtered client-side to items whose `tanggal` === today, then rendered
        │          (no filter UI, no search, no date picker, no approval action)
        │
        ├─ FAB → scan → camera QR
        │          verifyQrPayload()  local HMAC against EXPO_PUBLIC_QR_SECRET_KEY
        │          isQrFresh()        local 48h window
        │          → alert "SPB Terverifikasi" (prints parsed.qty, then discards it)
        │          → router.replace('/(krani)/timbangan/add', { checkerId })
        │                    the raw QR string is NOT carried forward
        │
        └─ add ── GET /bkmChecker/:id (any status)   ← no status gate, no duplicate check
                   GET /orgConfig → bjr
                   operator types timbang_isi / timbang_kosong
                   client derives netto + an "estimasi janjang × bjr" comparison at a hardcoded 20%
                   →
                   POST /kraniTimbang { origin_source: 'BKM_CHECKER', source_checker_ids: [checkerId],
                                        details: [ ONE row = sum of every detail ] }
                   → ticket created with status DRAFT. Nothing in this app ever approves it.

Documented flow (`.opencode/skills/sawitin-backend/references/reconciliation.md:96-97`):
        scan → POST /staging/krani-timbang with the RAW payload string.
        "Do NOT call POST /kraniTimbang for QR-scanned entries."
```

## 2. Severity legend

| Level | Meaning |
| --- | --- |
| **P1** | A weighing record is wrong, lost, invisible, or cannot be completed at all. |
| **P2** | The user cannot correct, recover from, or reason about the flow. |
| **P3** | Friction, inconsistency, inaccessibility. |
| **P4** | Polish. |

---

## 3. P1 findings

### KT-01 — The whole SPB path bypasses the staging pipeline it was built for

`scan.tsx:134-137` forwards only `checkerId`; `TimbanganScreen.tsx:66` re-fetches the checker by raw id;
`TimbanganScreen.tsx:154` posts to `POST /kraniTimbang`. `services/staging.service.ts` — the wrapper for
`/staging/krani-timbang` — is imported by **no screen** (only `services/index.ts:17`).

That endpoint is not a prototype: it verifies the payload signature server-side, enforces freshness, resolves the
TPH inside the org, **de-duplicates on `unique_transaction_id`** (409 on replay), requires
`status: "APPROVED" and krani_timbang_checkers: { none: {} }`, computes the discrepancy against a configurable
tolerance, writes `bkm_status_log`, and falls back to parking an unmatched scan in `pending_timbangan_log` until the
mandor's offline document syncs (`stagingController.ts:27-173`). **None of that runs.** It is dead code on the client.

Impact, concretely:

- A truck can be weighed repeatedly. `POST /kraniTimbang` validates only that the checker ids exist in the org
  (`kraniTimbangController.ts:59-67`) — no status check, no prior-weighing check. The 409 duplicate protection
  exists only on the staging path.
- The scan screen's local HMAC check is treated as the authorization gate, but it is not a security control
  (`EXPO_PUBLIC_QR_SECRET_KEY` ships inside the bundle — CHK-03b in the checker audit). The server-side check that
  would be meaningful is the one being skipped.
- The documented out-of-order case — krani reaches the mill gate before the mandor's offline checker document has
  synced — cannot be represented at all. `POST /kraniTimbang` answers `"Invalid source checker for this
  organization"` (`:64`); staging parks the scan as `PENDING`.

This is the same defect as CHK-06, seen from the consumer's side. §9(a) records how it interacts with the multi-truck
question.

Smallest fix: `scan.tsx` posts `{ qr_payload, nama_supir, nomor_kendaraan, tujuan_kirim }` to
`/staging/krani-timbang` and routes on the response — `201 reconciled`, `202` queued for reconciliation, `409`
duplicate, `400/403` rejected with the server's message. Keep `POST /kraniTimbang` for the manual entry path
(`origin_source: MANUAL`). This makes CHK-01's four consequences the prerequisite, not a follow-up.

### KT-02 — One document = one ticket, one truck's identity, and the whole document's tonnage

`TimbanganScreen.tsx:132-151`: the payload takes `nama_supir` / `nomor_kendaraan` / `tujuan_kirim` from
`checker.details[0]` and sends a **single** detail row carrying `totalJanjang` and `totalBrondol` summed over *every*
detail (`:104-107`). The SPB card above it (`:230-259`) likewise renders `details[0]`'s driver and plate while
labelling the totals as the document's.

A 3-truck BKM Checker therefore produces one weighbridge ticket that says "Truk B 1234 XY / Sopir A" and asserts the
bunch count of A+B+C. Per-truck tonnage cannot be reconciled — the same finding as CHK-01, which decided **the
document is the unit** and that multiple trucks per document stay supported. That decision has not reached this
screen: the krani can only ever create one ticket per document, and the four backend assumptions listed in CHK-01
(dedup key, never-weighed gate, discrepancy baseline, ticket↔truck link) are untouched.

Note the consequence for KT-03: because a ticket created here already links the document via
`krani_timbang_checker`, the document is now `krani_timbang_checkers: { none: {} }`-false, so **it can never be
reconciled through staging either**. The document is permanently spent on an unapproved DRAFT ticket.

Smallest fix: depends on the SPB unit, but the presentation half is independent and free — list every truck on the
SPB card (CHK-01) so the operator can see the mismatch before submitting, and either create one ticket per truck or
route through staging where the QR's own `qty` and `tphId` describe a single truck (see §9(a)).

### KT-03 — A freshly saved weighing does not appear in the list, and no past day is reachable

`KraniTimbangHistory.tsx:24-28,39-40` computes today with a device-local helper and keeps only items where
`i.tanggal === today` — an **exact string equality** against `'YYYY-MM-DD'`. `tanggal` is a Prisma `DateTime`
(`schema.prisma:533`); the app sends a date-only string itself (`TimbanganScreen.tsx:137`), and every other DateTime
in this codebase arrives at the client as a full ISO timestamp — which is exactly why
`BKMCheckerFormStep1.tsx:14-22` needs a `formatLaporanDate()` to slice one down, and why the web client models the
field as `z.date()` (`KraniTimbang.model.ts:43`). The web-side fixture is `'2025-04-18T10:15:00.000Z'`.

If the wire value is a full timestamp, `=== today` never matches, so:

- the krani saves a weighing, returns to history, and sees "Belum ada timbangan hari ini";
- the dashboard widget (`TodaySummary.tsx:159`, same equality) reports `0` and `0.0 t`;
- `KraniTodaySummary` reads as "no work done", not as an error.

Compounding it, the list is hard-filtered to today with no date picker, filter sheet or search, so **no past weighing
is reachable in the app at all** — yesterday's tickets are absent by construction even when the equality holds. The
list also never displays `created_at` or `nomor_dokumen`, so ordering by `created_at:desc` is invisible to the user.

BKM Panen has the answer already (`FilterSortSheet`, sort, "Urut & Filter"). Contrast `TodaySummary.tsx:214`, which
reads the same class of field with `String(h.date).startsWith(today)` — the two comparisons disagree about the wire
format inside one file.

Smallest fix: filter on a date range against the *parsed* value (`estateDate(new Date(i.tanggal))`), and replace the
silent today-only filter with a visible, removable day filter or a date picker. Verify in §7, item 1 before and after.

### KT-04 — Every ticket this app creates is a DRAFT that nothing in the app can approve

`TimbanganScreen.tsx:154-173` posts and shows `Alert.alert("Berhasil", "Data timbangan berhasil disimpan.")`.
`kraniTimbangController.ts:81` forces `status: DocumentStatus.DRAFT`. No status is ever displayed on the input screen,
the history card, or the detail view, and there is no approve, submit, edit or reject action anywhere on any Krani
screen (grep: the only `hasPermission` calls in the app are `(admin)/menu.tsx`, `QuickActions.tsx`, `AdminModuleGuard`,
`RoleTabs`).

The seeder and the docs agree that the approver is **Admin**, and that the maker is not: `krani_timbang_role` gets
`mod_krani_timbang: crud` — `approve: false` (`roleSeeder.ts:110`, preset at `:20-22`); only Administrator and
Manajer Kebun hold `fullAccess` (`:51`, `:131`). The web UAT script expects exactly that — "Sebagai admin:
**Setujui** → **APPROVED**; tombol **Cetak** (SPB) tersedia" (`docs/web/e2e-uat-guide-web-roles.md:122`, matrix row
9 at `:180`). Mobile then breaks the design in two independent ways:

- the operator who performs the weighing cannot approve it, and is never told the document is incomplete;
- the role that could approve it does not reach the screen — `RoleTabs.tsx:45` hides `timbangan` for `(admin)`, and
  the `(asisten)` group (which is where Manajer Kebun lives, `navigation.ts:44-45`) has no `timbangan` tab at all
  (`:37-41`).

Net effect: the ledger stays in `DRAFT` for every mobile-created record.

`approveKraniTimbang` accepts any non-approved status (including `DRAFT`) in one hop
(`kraniTimbangController.ts:277-288`), and `PUT /:id` will accept `status: "APPROVED"` from anyone holding `write`
(`:178-192`) — so the *dedicated* approve action is the stricter path, not the looser one. That asymmetry is worth
resolving while fixing the gate.

Recommendation (§9(b)): keep the maker/checker split the seeder already implements — krani stays `crud` and should
see "Dikirim untuk persetujuan" rather than a bare "Berhasil"; the documented approver (Administrator, and Manajer
Kebun where they have module access) gets the approve action **on the Timbangan screen it can already open**, rather
than a new role being drafted in by analogy with CHK-08.

### KT-05 — Offline weighing is impossible, although this is the screen that most needs it

`TimbanganScreen.tsx:154-173` calls `createMutation.mutate` with no network check, no queue, no cache. Offline, the
axios interceptor throws and the user sees `Alert.alert("Gagal", "Network Error")`
(`services/api.ts:41-53`); the typed weights are still on screen, but the only recovery is to retry by hand, and
leaving the screen loses them. `stores/useKraniTimbangStore.ts` — a ready-made draft model with `calculateNetto`,
`addDetail`, `startEditing` and `reset` — is imported by **nothing but its own barrel** (`stores/index.ts:6`), so no
draft survives.

The rest of the app is far ahead: BKM Panen queues offline creates, updates, deletes and revokes
(`BKMPanenFormStep4.tsx:105-152`, `useBkmPanenActions.ts:56-137`), BKM Checker queues its submit
(`BKMCheckerFormStep3.tsx:126`), and BKM Panen reads from SQLite when the network fails
(`bkm-panen.service.ts:16-53`). Krani Timbang has neither: `services/krani-timbang.service.ts` contains no `try`/
`catch` at all, and `useSyncProcessor.ts:54-132` has **no `krani_timbang` branch** — which, under the silent-success
rule in C3 of the offline-sync audit, means an item queued for this module would be deleted on the next sync pass
rather than uploaded. So the offline fix must land queue branch and producer together.

Impact: the weighbridge is a shed with a scale, frequently out of coverage. Today a connectivity blip means the
truck's weight is re-entered from scratch, or not recorded.

Smallest fix: reuse the BKM Panen shape — `if (!isOnline) { addToQueue({ module: 'krani_timbang', action: 'CREATE', … }) }` with an `isOnline` flag from `useNetworkStore`, **plus** the matching `processItem` branch and an explicit `throw` for unhandled modules. Staging (§9(a)) is actually the better vehicle here: it is designed to accept a weighbridge submission while the checker document is still unsynced, so it can absorb the offline case server-side instead of in the queue.

### KT-06 — No idempotency: a timeout after a successful save creates a second ticket for the same truck

`services/api.ts:11` sets `timeout: 10000`. The mutation's only guard is `createMutation.isPending` + the disabled
button (`TimbanganScreen.tsx:336`), which covers double taps but not the case that matters: the server commits, the
response is lost, `onError` fires, the operator taps again, and a **second ticket is created for one physical
weighing** — with no dedup key on this endpoint (KT-01) and no way to delete a ticket from the app (KT-04).

Smallest fix: none needed client-side if KT-01 lands (staging's `unique_transaction_id` returns 409 on replay, which
is exactly the idempotency required — note it also makes the QR itself the dedup key, and the QR is stable, unlike a
render-clock timestamp; see CHK-03). If the direct path is kept, it needs a client-generated key and server-side
de-duplication, per C1 of the offline-sync audit.

---

## 4. P2 findings

### KT-07 — The SPB's own certified quantity is displayed and then thrown away

`scan.tsx:126-128` shows `Total Janjang: ${parsed.qty} janjang` in the confirmation dialog, then routes with only
`checkerId`. `TimbanganScreen.tsx:104-105,148` recomputes `totalJanjang` from the checker's details at submit time —
and nothing anywhere compares the two. `ReconciliationService` compares `parsed.qty` against the checker, but that
code is unreachable from this path (KT-01).

So the number the SPB exists to certify is never reconciled on the client, and the operator is never told that the
SPB they scanned and the document they loaded disagree. They *do* see the disagreement rendered as a weight warning
once they type a weight (KT-09) — but only as a derived consequence, with the wrong baseline.

Smallest fix: carry the QR's `qty`/`tphId` into the input screen (route params) and show it beside the checker totals
before submit; better, let the server do it (KT-01).

### KT-08 — Reconciliation math compares one truck's weight against every truck's janjang

`TimbanganScreen.tsx:104-112`: `estimatedKg = Σ(details.janjang) × bjr`, `diffPct` versus `netto`, warning above a
hardcoded **20%**. Against a multi-truck document this guarantees a false alarm on every individual ticket — the
same structural error the checker audit recorded at the backend (`stagingController.ts:88-94`).

Two further mismatches:

- The threshold is invented client-side. The backend's `DISCREPANCY_TOLERANCE_PCT` defaults to **2** and is what
  decides `APPROVED` vs `REVISION_REQUESTED` (`config.discrepancyTolerancePct`, used at `stagingController.ts:104`).
  The client stays silent about a discrepancy the server would reject, and warns (using its own baseline) about ones
  it would accept.
- `bjr` falls back to `15` when config is absent (`:80`) and is then presented as fact in the estimate line
  (`:295-300`) — same shape as CHK-22.

Smallest fix: compare per truck, and take the tolerance from the server instead of hardcoding it.

### KT-09 — The weighing form's document cards destroy the document

`TimbanganScreen.tsx:230-259`. The card shows:

| Row | Value | Problem |
| --- | --- | --- |
| Nama Sopir | `details[0]?.nama_sopir \|\| "-"` | one truck's driver for an N-truck document |
| Nomor Kendaraan | `details[0]?.nomor_truk \|\| "-"` | same |
| Tujuan Kirim | `details[0]?.tujuan_kirim \|\| "-"` | same |
| Blok / TPH Asal | `checker.blok?.nama` / `checker.tph?.nama` | document-level, but the payload sends `checker.tph_id` only |
| Total Janjang / Brondol | `totalJanjang` / `totalBrondol` | the whole document, styled as if it were one truck's load |

The document's identity is also absent: no `nomor_dokumen`, no `status`, no `approved_by`, no truck count, no per-truck
breakdown. The same five rows become the **permanent ticket identity** (`nama_supir`, `nomor_kendaraan`,
`tujuan_kirim` are columns on `krani_timbang`) — a ticket that cannot name the truck it weighed.

Smallest fix: show `status` and the truck list with per-truck `jumlah_janjang`, and either move truck identity to the
ticket per truck or make the header explicitly say "Dokumen (N truk)".

### KT-10 — The ticket's `tanggal` is the submission moment, and the estimator keeps a local copy

`TimbanganScreen.tsx:137` sends `new Date().toISOString().split("T")[0]` — UTC-derived, from the device clock, at
submit time, not the weighing moment. A weighing at 00:30 WIB (17:30 UTC the previous day) is filed as the previous
day, and a device with a wrong clock mis-files silently. `tanggal` is the field the history and dashboard filter on
(KT-03), so this feeding edge is the same defect from the other side.

Separately, `TimbanganScreen.tsx:70-78` holds `detailId` and fetches `useKraniTimbangDetail(detailId ?? "")`, while
the reset effect at `:83-87` depends only on `checkerId` — and `detailId` is never passed by any caller
(`app/(krani)/timbangan/index.tsx:11` is the only place that builds that link, and only for legacy redirects). The
local `detail`/`refetchDetail` path is unreachable, and if it were reached the form would not reset with it.

Smallest fix: send the estate date (`utils/estateDate.ts`, already used by `Pember`/attendance) and let the server
stamp `created_at`. Reset on both params.

### KT-11 — No permission check anywhere on the Krani surface

`RoleTabs.tsx:56` gates the whole tab group on `mod_krani_timbang:read`. Past that gate, nothing in
`components/krani/*` or the krani routes consults permission again — so **write** is enforced only by the backend. A
role holding `read` but not `write` (or the read-only Admin, or any future auditor role) gets a working, enabled
"Simpan Timbangan", fills the form, and receives `403 Forbidden: Missing write permission on mod_krani_timbang`
rendered verbatim by the error alert (`TimbanganScreen.tsx:165-172`). The sibling pattern exists and is unused:
`useAuthStore.hasPermission` (`useAuthStore.ts:77-89`), as used by `QuickActions.tsx:43-48` and
`AdminModuleGuard.tsx:15`.

Smallest fix: gate the submit button on `hasPermission('mod_krani_timbang', 'write')` and hide the FAB/scanner for
read-only users, mirroring BKM Checker's client-side approve gate (CHK-08).

### KT-12 — The state management layer is dead code, and the weighing runs unguarded

`stores/useKraniTimbangStore.ts` (84 lines) is imported by nothing (`grep -rn useKraniTimbangStore` → its own
definition and `stores/index.ts:6`). `TimbanganScreen` keeps `useState` locally instead. The abandoned store is
nevertheless the clearest statement of what the screen is missing:

- `startEditing(id, header, details)` — the *edit an existing ticket* capability, which the app does not have;
- `calculateNetto()` — netto derivation, which the screen reimplements inline (`:97-102`);
- `setHeader` with netto recomputation on either weight — the draft model an offline path (KT-05) would hydrate from;
- `removeDetail` / `updateDetail` — the multi-detail model (KT-02).

`services/krani-timbang.service.ts` likewise ships `update`, `delete`, `approve`, `reject` and four detail methods
with **no call sites** (`hooks/useKraniTimbang.ts` only wires `getAll`, `getById`, `create`), and `types/staging.ts`
+ `services/staging.service.ts` are unreferenced.

Smallest fix: delete what is not going to be used now (staging excepted if §9(a) is adopted), and if edit+approve are
intended, build them — a DRAFT ticket with no correction path is the trap KT-04 describes.

---

## 5. P3 findings

| # | Finding |
| --- | --- |
| KT-13 | **Weight parsing silently corrupts decimal input.** `TimbanganScreen.tsx:90-94` strips every `.` as a thousands separator and converts `,` to a decimal point, so `"5.5"` parses as **55**. With `keyboardType="numeric"` (no decimal key on Android) this is likely unreachable in practice, but the same function is the only guard on the number that becomes `netto`. There are no sanity bounds at all — a 900 000 kg typo saves happily. |
| KT-13b | **Nothing on the ticket can be corrected after submit.** `nama_supir`, `nomor_kendaraan` and `tujuan_kirim` are copied from `checker.details[0]` and written straight to columns on `krani_timbang`; weights are written once. The app has no edit, delete, reject, void or resubmit action on any Krani screen (`hooks/useKraniTimbang.ts` wires only `getAll`/`getById`/`create`, leaving `update`/`delete`/`approve`/`reject` unreferenced in `services/krani-timbang.service.ts`), and `stores/useKraniTimbangStore.ts`'s `startEditing` is unreachable (KT-12). A wrong plate, a wrong driver, or a transposed weight is permanent — and because the ticket already links the document, it also costs the document its remaining reconciliation options (KT-02). This is the Krani-side face of CHK-05. |
| KT-14 | **Detail view shows the raw timestamp.** `TimbanganScreen.tsx:415` renders `{detail.tanggal}` verbatim, so a DateTime param appears as `2026-09-15T00:00:00.000Z` — the same defect the recent web commit `6c1ce21` ("standardize Indonesian date formats") fixed on the web side. |
| KT-15 | **The detail view omits the ticket's identity and state.** It shows driver, vehicle, destination, and weights, but not `nomor_dokumen`, `status`, `origin_source`, `approved_by`, `created_at`/`created_by`, or the `keterangan`-based rejection note. `keterangan` is rendered as a plain italic "Catatan" (`:452-454`) with no distinction between an operator note and a server-written one (`stagingController.ts:106` and `kraniTimbangController.ts:328` both write into this field). |
| KT-16 | **Contrast failures on Krani surfaces.** Measured against `constants/Colors.ts` and the inline literals: `textMuted #999999` on `cardBg #fff` — history card metadata (`KraniTimbangHistory.tsx:125`, 13px) = **2.85:1** (fail); `#558B2F` on `#F1F8E9` — "Berat Bersih (Netto)" caption = **3.78:1** (fail at 13px); `#E65100` on `#FFF3E0` — the discrepancy warning (`:660-666`, 12px) = **3.46:1** (fail); white on `success #4CAF50` = 2.78:1 (fail, used by badges); white on `button #C4A35A` = 2.40:1 (fail). Passing: white on `primary` 4.64, `textSecondary` 5.74, the netto **value** `#33691E` on `#F1F8E9` 6.08. |
| KT-17 | **History cards and detail rows are inaccessible.** `KraniTimbangHistory.tsx:84` is a bare `TouchableOpacity` with no `accessibilityRole`, composed label, hint or actions — the exact work `PanenCard.tsx:21-29` received under "Document cards" in the UI/UX audit. The card's icon is decorative but announced. The detail screen's label/value pairs (`styles.row`, `:579-593`) are two ungrouped `Text` nodes per row, so a screen reader reads a run-on string with no field association. The two "Coba Lagi" retry buttons (`:213-215`, `:376-378`) are bare `Pressable`s. |
| KT-18 | **The scan overlay has no accessibility affordance.** `timbangan/scan.tsx:230-240`: the target frame and the instruction are visual only; there is no `accessibilityLabel` on the camera surface explaining what is being scanned, and no non-camera fallback (manual id entry) for a cracked lens or a device without a working camera. `frameSize = width * 0.65` (`:246-247`) is a phone assumption — on an 800pt-wide tablet the frame is 520pt. |
| KT-19 | **The result is unverifiable at the moment of truth.** Success is `Alert.alert("Berhasil", "Data timbangan berhasil disimpan.")` (`:156`) — no netto echo, no ticket id, no status. The operator is back at history (which may not show the row at all, KT-03) with nothing to confirm against. |
| KT-20 | **Error messages are the raw HTTP layer.** `TimbanganScreen.tsx:165-172` prints `err.message` from `ApiError`, which for the common cases is `"Network Error"`, `"timeout of 10000ms exceeded"`, or `"Request failed with status code 403"` (`services/api.ts:44-51`; a network failure is even coerced to `status = 500`). The load-failure path is a fixed "Gagal mengambil data SPB" that hides whether the document is missing (404), forbidden (403) or the network is down. |
| KT-21 | **BJR fallback is presented as data.** `:80` `orgConfig?.bjr ?? 15` — a missing org config silently becomes 15 kg/janjang in the "Estimasi dari janjang" line (`:296-299`). CHK-22 raised this for the checker; it recurs here, on the number used for the discrepancy verdict. |
| KT-22 | **Admin parity gaps.** Administrator and Manajer Kebun hold `mod_krani_timbang: fullAccess` (`roleSeeder.ts:51,131`) and reach this module through `Menu → Timbangan` (`ADMIN_MODULES`, checked by `check-navigation.cjs`), but the admin surface is the krani screens verbatim — so the only role that *can* approve has **no approve action anywhere in the module** (KT-04), and `AdminModuleGuard` admits it on `read` alone (`AdminModuleGuard.tsx:15`), which is weaker than what the FAB then lets it do. |
| KT-23 | **The history endpoint fetches 100 rows and says nothing about the limit.** `KraniTimbangHistory.tsx:32-36` requests `limit: 100`; the same figure drives the dashboard count (`TodaySummary.tsx:155`), so a day with more than 100 weighings under-reports in both places, with no "showing 100 of N" signal (CHK-24 and CHK-15 are the same pattern). |

---

## 6. P4 findings

- **KT-24** — `nomor_dokumen` is never displayed and `kraniTimbangController.ts` never sets it, so every mobile
  ticket is identified only by a UUID; the SPB and the ticket cannot be cross-referenced on paper.
- **KT-25** — `formatPossibleDate` exists on the web side (`Saweed-Reactjs/src/lib/date.ts:95-111`) precisely to
  normalize the two shapes `tanggal` can take; the mobile app has `formatLaporanDate`
  (`BKMCheckerFormStep1.tsx:14-22`) and no shared equivalent. Worth one shared helper before KT-03 is fixed twice.
- **KT-26** — `DetailTimbanganView`'s "Timbang Isi (Gross)" row prints `toLocaleString("id-ID")` for both weights
  and netto (`:430-451`), so three numbers the SPB reconciles are shown in the operator's locale rather than a fixed
  format; and `styles.detailMuatanText` is used for both columns of the detail row (`:463-469`), so the `flex: 1`
  on both makes the two values collide on narrow screens.
- **KT-27** — The scan screen keeps the torch button mounted but drops `onBarcodeScanned` after the first hit
  (`:223`); a subsequent rescan requires backing out. `hasScanned` resets on focus only (`:62-67`), so the
  post-scan "Coba Lagi" path is the only in-screen recovery.
- **KT-28** — `app/(krani)/timbangan/index.tsx:8-12` preserves legacy `checkerId`/`detailId` query links by
  redirecting — correct, but it means `add.tsx` is reachable with `checkerId` from a URL, which bypasses the
  scanner's local QR checks entirely. With KT-01 fixed server-side this stops mattering.
- **KT-29** — `mod_detail_krani_timbang` is seeded to three roles (`roleSeeder.ts:52,111,132`) and **never enforced
  anywhere**: all four `/kraniTimbang/detail` endpoints gate on `mod_krani_timbang` instead
  (`kraniTimbangRoute.ts:97,106,115,124`), and `permissionMiddleware.ts:38` maps a `/detailKraniTimbang` base route
  that no route file mounts. Two related guard mismatches on the same router: `DELETE /detail/:id:124` requires
  `write` where every sibling parent rule uses `delete`, and the detail endpoints accept `write` where the parent
  `PUT /:id` requires the same — so `update: true, write: false` is a 403 on update despite the name. Out of scope
  for the mobile client (it never calls these), but it is the permission model the audit's §9(b) relies on, so it
  should not be discovered later.

**Implementation note (not a finding).** A server round-trip for KT-03 will also settle a latent type mismatch worth
handling in the same PR: `timbang_isi`, `timbang_kosong` and `netto` are `Decimal? @db.Decimal(10, 2)`
(`schema.prisma:534-536`), which Prisma serializes to JSON as **strings**, while `types/krani-timbang.ts:15-17`
declares them `number | null`. The code already works around this in three places with `Number(...)`
(`TimbanganScreen.tsx:385,389`, `TodaySummary.tsx:162`), which is evidence the wire type is a string — the
declarations should say so.

---

## 7. Needs device verification

1. **The `tanggal` comparison (KT-03) — highest priority.** Log a HTTP response body for
   `GET /kraniTimbang?limit=1` and read the literal `tanggal` value. Save a weighing, then reopen the history tab and
   the Beranda widget: does the new ticket appear, and does the count move off 0? Then change the device clock past
   midnight WIB and confirm the previous day's ticket leaves the list.
2. **Scan → input → save → history**, on Android hardware Back and iOS gestures at each step, including Back from
   the input screen mid-typing (is the weight lost?), and Back from history to Beranda.
3. **The success dialog's "Lanjutkan Timbangan" path and the failure path**: what does the operator actually see when
   the save fails for network, for 403, and for a checker already weighed?
4. **TalkBack/VoiceOver pass** over the history card, the scan overlay, the label/value rows, and the "Simpan
   Timbangan" button state changes.
5. **Keyboard overlap**: two numeric fields plus a multiline note sit above a fixed footer with
   `paddingBottom: Math.max(insets.bottom + 88, 96)` (`:322-330`) and `KeyboardAvoidingView` behavior `height` on
   Android — confirm the netto readout and the discrepancy warning are not hidden while typing, at 200% font scale.
6. **Outdoor legibility**: the netto readout and the amber discrepancy card under mill-shed daylight, on a dimmed
   screen (note the scanner raises brightness to 1.0 on focus and restores on blur, `scan.tsx:26-59` — confirm no
   stuck-bright screen after an alert-triggered navigation).
7. **A weighing with a real scale**: enter a 6 355 / 5 200 kg pair and confirm the parsed netto is 1 155 (spot-checks
   KT-13's parser with the format operators actually type).

## 8. Verified working — do not regress

- `useModuleGroup('(krani)')` keeps every shared screen in the group that opened it, and legacy
  `?checkerId=`/`?detailId=` links redirect into the current structure (`timbangan/index.tsx:8-12`,
  checked by `scripts/check-navigation.cjs`).
- The local parse → display → validate chain behaves: gross must exceed tare, the error is rendered on the *gross*
  field via `FormField`'s accessible alert row (`FormField.tsx:53-62`), and the submit button is disabled while
  either field is empty (`:336`). No submit is possible with an invalid pair.
- Netto is derived, not typed, and updates live; the discrepancy warning is real UI, not a console log.
- Camera permission handling is complete: prompt on mount when undetermined, explicit denied state with a working
  "Berikan Izin Kamera" / "Buka Pengaturan Kamera" split, and a re-check of permission when the app returns from
  Settings via the `AppState` listener (`scan.tsx:70-82,192-208`).
- The camera unmounts when the screen loses focus (`:220`, `isFocused`), and brightness is restored on blur
  (`:47-57`).
- `scan.tsx` guards duplicate scans three ways (`hasScanned`, `isAlerting`, and clearing `onBarcodeScanned` on the
  frames after a hit), so one QR cannot fire two navigations.
- Weight display on the detail screen uses `toLocaleString("id-ID")` with correct null handling (`:432-449`).
- History has pull-to-refresh with a typed `RefreshControl`, and empty/error/loading are three distinct states
  (`ListEmptyState`), with the error state offering retry.
- The Krani dashboard widget degrades to "Tidak tersedia" on error rather than showing `0` — the UI/UX audit's
  "dashboard status" resolution holds here.
- `estateDate` (WIB, UTC+7) is already imported by `TodaySummary.tsx:1` — the WIB helper is in place and only the
  history screen's duplicate local helper has to go.

## 9. Decisions and recommendations

### (a) Does this screen adopt `/staging/krani-timbang`? — recommendation: yes, and it settles KT-02 at the same time

The sibling audit (§10c there) concluded staging is the intended contract. From the Krani side the evidence is
sharper, because the QR is what the krani holds:

- The QR carries `checkerId`, `tphId`, `qty` and `ts` — **a truck-level claim**, while `POST /kraniTimbang` is
  document-level. Routing through staging makes the QR quantity authoritative and removes the need for
  `TimbanganScreen` to derive a ticket from `details[0]` and a summed detail row. KT-02 and KT-07 both dissolve.
- The `unique_transaction_id` dedup key is the QR string, which is stable — so KT-06's double-submit is closed by
  the same change, without the client-side timestamp trap CHK-03 warns about.
- The krani can be at the mill before the mandor's offline document has synced; only staging represents that.

The prerequisite stands: CHK-01's four backend consequences (per-weighing dedup key, per-detail never-weighed gate,
per-detail discrepancy baseline, `bkm_checker_detail_id` link) must land first, or staging will accept one truck per
document and 409 the rest. So the sequence is CHK-01 → this. Until then, the *manual* weighing path must stay on
`POST /kraniTimbang` and KT-01's local HMAC check should be understood as UX only, not authority.

### (b) Who approves a weighing, and where? — recommendation: Administrator first (the documented approver), Manajer Kebun second; do not re-grant the maker

KT-04 leaves every mobile ticket in `DRAFT` with no reachable approver. The permission model already has `approve` as
a first-class action and the seeder already withholds it from the maker (`krani_timbang_role: crud`), which is the
correct maker-checker shape — it just never gets exercised because the approver cannot reach the module.

The documented answer already exists and should be followed rather than re-invented:
`docs/web/e2e-uat-guide-web-roles.md:122` ("Sebagai admin: **Setujui** → **APPROVED**; tombol **Cetak** (SPB)
tersedia") and `:180` ("| 9 | Admin | Setujui Krani | APPROVED, SPB bisa dicetak |"). Only `admin_role` and
`manajer_role` hold `approve` on `mod_krani_timbang` (`roleSeeder.ts:51,131`), and **no document assigns krani
approval to `krani_timbang_role`** — the seeder is consistent with the design. An earlier draft of this section
recommended making Asisten Afdeling the approver by analogy with CHK-08; that analogy is wrong here, because the
krani approval also gates printing the delivery note, which the e2e matrix assigns to Admin.

Recommended smallest form:

1. Keep `krani_timbang_role` at `crud`; the krani submits and sees "Dikirim untuk persetujuan" rather than a bare
   "Berhasil". KT-04's client half is then just: show the status, and gate the submit button on `write` (KT-11).
2. Add the approve action to the **Admin Timbangan detail screen** — no permission change needed, since
   `AdminModuleGuard` already admits anyone with `read` and Administrator/Manajer hold `fullAccess`. This is the
   whole fix for the primary case, and it is where the documented approver already is. Gate the button on
   `hasPermission('mod_krani_timbang','approve')` so a `read`-only admin does not get a raw 403 (the CHK-08 client
   half).
3. For Manajer Kebun — who maps to the **`(asisten)`** route group (`navigation.ts:44-45`) and therefore has no
   Timbangan tab (`RoleTabs.tsx:37-41`) — either route them through `Menu → Timbangan` like an Administrator, or
   widen Ch. 3 to the `(asisten)` group. Do **not** grant the Asisten Afdeling role a new approval duty on this
   document without an explicit ops decision: it holds no krani permission at all today (`roleSeeder.ts:89-103`).
4. Tighten `approveKraniTimbang` to accept only a legitimate prior status (`kraniTimbangController.ts:277-288`
   currently approves from `DRAFT` in one hop), and reconsider letting `PUT /:id` carry `status: "APPROVED"` on
   `write` alone (`:178-192`) — that path makes the dedicated `approve` permission advisory for anyone the seeder
   gave `write` but not `approve`.
5. If any role grant changes, it needs a reseed/migration — permissions are database rows, not code.

The judgement call is the same one CHK-08 flags: on a site with no Administrator reachable at the mill, refusing
everyone else blocks the ledger. Prefer an org-config flag over silently re-granting the maker.

### (c) What is the ticket's unit? — recommendation: one ticket per weighing, one weighing per truck

KT-02 is not a presentation bug: the backend has `detail_krani_timbang` (many per ticket) and
`krani_timbang_checker` (many tickets per document, `@@unique([krani_timbang_id, bkm_checker_id])`). The intended
shape is a junction of single-weighing tickets, which is why the junction table exists. The mobile screen collapses
that to one ticket per document and then cannot name the truck it weighed.

The migration cost is low because the schema already supports it; the work is on the client (one submit per scanned
truck, QR quantity per truck) and in CHK-01's four backend assumptions. If ops instead confirms that one document
never carries more than one truck dispatched to the same mill, then the honest fix is to **enforce** that at the
checker's wizard rather than leave this screen guessing which truck it is weighing.

### Suggested PR sequence

| PR | Scope | Findings closed |
| --- | --- | --- |
| 1 | Filter on parsed dates via `estateDate`; show the weighing date and `created_at`; add a day filter or date picker; surface `status` on card + detail; format `tanggal` in the detail view; reset the form on `detailId` too | KT-03, KT-10 (partly), KT-14 |
| 2 | Gate the submit on `hasPermission('mod_krani_timbang','write')`; hide FAB for read-only; echo netto + ticket id + status in the success alert; map error shapes to operator language | KT-11, KT-19, KT-20 |
| 3 | CHK-01's four backend changes, then `scan.tsx` → `/staging/krani-timbang`, carrying `qty`/`tphId` into the input screen and deleting the local-secret `verifyQrPayload`/`isQrFresh` gate to instant-feedback-only | KT-01, KT-06, KT-07 (with §9a) |
| 4 | Admin approve action (permission-gated on `approve`), `approveKraniTimbang` prior-status gate, Manajer route to the module; plus a correction path for an unapproved ticket (edit or delete while `DRAFT`, reusing the store's `startEditing`) | KT-04 (with §9b), KT-13b |
| 5 | Offline: `isOnline` branch + `addToQueue` + the `krani_timbang` branch in `processItem` (`throw` on unhandled modules first — C3 there) + hydrate from `useKraniTimbangStore` | KT-05 |
| 6 | Per-truck ticket or an explicit single-truck constraint at the checker; per-truck SPB card; per-truck discrepancy baseline and server-side tolerance | KT-02, KT-08, KT-09 (with §9c) |
| 7 | Accessibility (card roles/labels/actions, row grouping, retry buttons), contrast tokens, scan overlay label, dead-code removal, weight-parser bounds | KT-12, KT-13, KT-15…KT-28 |

PR 1 is a small diff with outsized effect and should ship first: until the list can show today's saves, no other
change on this screen is observable to the operator. PR 3 must stay one unit with CHK-01, for the reason stated in
§9(a).

**Per-PR verification:** `node --test scripts/check-audit.cjs scripts/check-navigation.cjs` plus
`node node_modules/typescript/bin/tsc --noEmit` (the convention this audit series established), and §7 gives the
device walkthrough that no static check can cover. If PR 1 or PR 5 lands, `scripts/check-audit.cjs` should gain a
case for the date filter and one for the `krani_timbang` queue branch — both are pure functions of the kind that
script already tests.
