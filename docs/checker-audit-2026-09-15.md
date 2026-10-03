# BKM Checker (mobile) — user flow & UI/UX audit — 15 September 2026

Static source review of the mobile Checker surface, its downstream consumer (Krani Timbangan), and the
backend endpoints they call. **No device or emulator walkthrough was performed**; every touch-target,
contrast and keyboard claim below is derived from source, not from a running app. Items that need a device
to confirm are listed in §8.

Audited surfaces:

| Surface | Files |
| --- | --- |
| List | `app/(mandor)/checker/index.tsx` |
| Create wizard | `app/(mandor)/checker/add.tsx` + `components/mandor/BKMCheckerForm.tsx` (steps 1–3) |
| Detail / approve / SPB | `app/(mandor)/checker/[id].tsx` |
| Admin surface | `app/(admin)/checker/*` — thin re-exports of the mandor screens, gated by `AdminModuleGuard` |
| State & data | `stores/useBkmCheckerStore.ts`, `hooks/useBkmChecker.ts`, `services/bkm-checker.service.ts`, `components/bkm/CheckerCard.tsx` |
| Downstream | `app/(krani)/timbangan/scan.tsx`, `components/krani/TimbanganScreen.tsx`, `utils/qr.ts` |
| Backend contract | `bkmCheckerController.ts`, `stagingController.ts`, `kraniTimbangController.ts`, `bkmChecker.schema.ts` |

## 1. Flow as implemented

```
Mandor tab "Checker" ─┐
Admin Menu → Checker ─┤
Dashboard pending card┘   (mandor only, ?status=SUBMITTED)
        │
        ├─ list: infinite scroll, no filter UI, no search, no delete
        │
        ├─ FAB → add.tsx → wizard
        │      1 Dokumen      blok, TPH, tanggal, keterangan, optional BKM Panen link
        │      2 Truk & Grading  N details; per detail tipe + truck/sopir/tujuan + 6 grading counters + brondol
        │      3 Review       header summary, totals, mismatch warning, confirm checkbox, submit
        │                     online: POST header → POST N details → PUT status=SUBMITTED
        │                     offline: one queued item {module:'bkm_checker', action:'CREATE'}
        │
        └─ detail  [id]
               SUBMITTED or APPROVED → SPB QR card + "Bagikan Tiket SPB (Gambar)"
               SUBMITTED → "Setujui Checker" (visible to every role that reaches this screen)
                        → POST /bkmChecker/:id/approve
                                    │
                                    ▼
                          SPB QR shared as PNG → Krani tab → Pindai QR
                          (client-side HMAC check + 48h freshness)
                                    │
                                    ▼
                          TimbanganScreen: GET /bkmChecker/:id (any status)
                                    │
                                    ▼
                          POST /kraniTimbang { origin_source: 'BKM_CHECKER', source_checker_ids }
```

## 2. Severity legend

| Level | Meaning |
| --- | --- |
| **P1** | Wrong or unapproved data reaches the weighbridge; or the documented flow cannot work at all. |
| **P2** | The user cannot complete, correct, or recover from the flow. |
| **P3** | Friction, inconsistency, inaccessibility. |
| **P4** | Polish. |

---

## 3. P1 findings

### CHK-01 — One document = one QR, but a document may hold many trucks

The wizard encourages adding multiple details (one per truck), `[id].tsx:93` signs **the sum of all details**
into the QR, and the SPB card prints only `details[0]`'s plate/driver/destination (`[id].tsx:126-132`).
The krani side mirrors the same split: it prefills truck identity from `checker.details[0]`
(`TimbanganScreen.tsx:132-136`) while submitting the **summed** janjang of every detail (`:104-107, :148`).

Impact: a 3-truck SPB says "Truk B 1234 XY / Sopir A" but carries the tonnage of A+B+C. The weighbridge ticket
cannot be reconciled to a physical truck, and tonnage is attributed to the wrong transporter. This is the
single highest-value defect on this screen.

Smallest fix: decide the unit. Either
(a) one SPB per detail — QR per detail with that detail's `jumlah_janjang`, and a share button per truck card, or
(b) one detail per document — move truck identity to the header and block a second detail.
(a) preserves the current data model; (b) is the smaller diff but deletes a capability the field may genuinely
need (several trucks dispatched from one TPH), so confirm with ops before taking it.

**Decision (15 September): the document is the unit.** One SPB QR per BKM Checker document; multiple trucks per
document stay supported. That is consistent with the backend's reconciliation design — the worker creates one
`krani_timbang` per weighing and links them all to the same document via the many-to-many
`krani_timbang_checker` (`ReconciliationService.ts:117-124`). But four places still assume exactly one weighing
per document and must change with it:

1. **Staging dedup key.** `pending_timbangan_log.@@unique([org_id, unique_transaction_id])`
   (`schema.prisma:912`) with `unique_transaction_id = V2|checkerId|tphId|qty|ts` (the QR itself, per
   `references/reconciliation.md`) means the single document QR can be accepted **once, ever**. Truck 2 gets a
   409. The key must become per weighing (e.g. `checkerId|detailId`, or a client UUID per weighing event).
2. **The never-weighed gate.** `stagingController.ts:78` requires `krani_timbang_checkers: { none: {} }`.
   Replace with "this truck's detail is not weighed yet".
3. **Discrepancy baseline.** Each weighing is compared against the *document total*
   (`stagingController.ts:88-94`, `ReconciliationService.ts:70-77`). With N trucks that makes every individual
   ticket look like a 60%+ discrepancy and every one lands in `REVISION_REQUESTED`. Compare against the detail
   being weighed; keep the document-level rollup as a separate dispatch-completeness check.
4. **No link from a ticket to a truck.** `krani_timbang_checker` links ticket↔document only. Add a nullable
   `bkm_checker_detail_id` plus `@@unique([bkm_checker_id, bkm_checker_detail_id])` — a DB constraint is the
   right place to make double-weighing of one truck impossible.

Presentation half of this finding is unchanged and still needs fixing: the SPB card must list **all** trucks, not
`details[0]` (`[id].tsx:126-132`).

### CHK-02 — The QR is issued before approval, and nothing downstream checks status

`[id].tsx:103` renders the SPB card for `APPROVED` **or** `SUBMITTED`, with the instruction "Tunjukkan kode QR ini
ke Krani Timbang". The project documentation says the opposite: "Once approved, a Surat Pengantar Buah (SPB) QR
code is generated" (`Saweed-Reactjs/docs/bkm-checker.md:5`).

The scan path enforces nothing either: `scan.tsx:90-123` verifies format and freshness only, then
`TimbanganScreen.tsx:65-67` fetches the checker by raw id with no status condition, and
`kraniTimbangController.ts:59-68` only checks that the ids exist in the org — it never checks `status: APPROVED`
and never prevents the same checker from being linked to a second weighbridge ticket.

The authoritative gate exists but is unused (see CHK-06): `stagingController.ts:73-79` requires
`status: "APPROVED"` **and** `krani_timbang_checkers: { none: {} }` (never weighed before).

Impact: unapproved cargo is weighed, the approval step becomes decorative, and one SPB can be scanned
repeatedly.

Smallest fix: gate the card on `data.status === 'APPROVED'`; for `SUBMITTED` show "Menunggu persetujuan —
SPB terbit setelah disetujui". Add `status: 'APPROVED'` to the checker lookup in the krani screen.

### CHK-03 — The SPB expires 48h after the **report date**, not after issue

`[id].tsx:94`: `const timestamp = Date.parse(data.tanggal_laporan) || Date.now();` — the QR timestamp is the
report date. `utils/qr.ts:43-46` rejects a payload whose age is outside `-5min .. +48h`, and the scanner enforces
it at `scan.tsx:108-123` with "QR Kadaluarsa … Silakan minta SPB baru dari Mandor". The backend reconciliation
reference states the intended semantic: `ts` is the "unix timestamp **ms at generation**".

Impact: a document whose `tanggal_laporan` is more than 48 hours old yields a QR that is expired the moment it is
displayed — the krani cannot scan it. A back-dated report (yesterday) dies today; a forward-dated one fails
immediately via the 5-minute skew allowance. There is also no re-issue action: the mandor's only recovery is to
create a duplicate document.

Smallest fix: **do not** simply sign `Date.now()` at render time. The staging dedup key *is* the QR string
(`unique_transaction_id`), so a payload that differs on every render silently removes the only duplicate
protection that exists today — the same document could then be weighed repeatedly. Sign a stable, server-issued
value instead (see §10(d)); if a client-side stopgap is taken first, sign `approved_at` (already stored,
`bkmCheckerController.ts:589-597`, and present on the `BkmChecker` type), never the render clock.

### CHK-03b — The SPB signature is keyed with a client-embedded secret (P1)

`utils/qr.ts:3` reads `process.env.EXPO_PUBLIC_QR_SECRET_KEY`, and the value is a literal in the app's
`.env.local` (key value omitted here). Expo inlines `EXPO_PUBLIC_*` values into the
shipped bundle, so the key is extractable from any installed copy of the app. The on-device check at
`scan.tsx:90-106` therefore proves nothing about authorship: a user can mint a valid-looking QR for any checker id
and any quantity, and the shipped weighbridge path never re-verifies server-side — it posts `source_checker_ids`
plus a self-declared `jumlah_janjang` (`TimbanganScreen.tsx:133-152`).

Impact: the single number the SPB exists to certify — how many bunches left the block — is self-asserted by the
client and trusted by the weighbridge. Unlike CHK-01…CHK-03 this is an integrity/security defect rather than a
routine failure, but it lands in the same place: unverifiable data on a weighed ticket. Verification only becomes
meaningful on the staging endpoint, which uses a server-side `QR_SECRET_KEY` and `timingSafeEqual`
(`stagingController.ts:31-45`).

Smallest fix: none client-side. Treat on-device verification as UX only, make the server the authority (CHK-06),
let the server mint the payload (§10(d)) so the client never holds a key, and rotate the committed key so the real
one never leaves the backend.

---

## 4. P2 findings

### CHK-04 — The wizard's Back gesture discards all entered data

`BKMCheckerForm.tsx:29-39` installs `usePreventRemove` on the whole route. It intercepts **any** removal —
header back arrow, hardware Back, iOS swipe — while the draft is dirty, and offers only
"Lanjutkan" / "Keluar" (destructive). Step navigation lives solely in the footer buttons; the Stepper at `:61` is
not interactive (`Stepper.tsx` accepts `onPress` per item but never wires it).

Impact: a checker on step 3 who taps the header arrow to fix step 2 loses every truck and every grading count.
The dialog wording ("Perubahan yang belum disimpan akan hilang") is honest but the only escape is data loss.

Smallest fix: when `step > 1`, back should `setStep(step - 1)`; prompt only on step 1. The form header title is
also static ("BKM Checker Baru" from `add.tsx:15`) and should follow the step.

### CHK-05 — No edit, no delete, no reject, no revision — the API exists, the UI does not

`useBkmCheckerStore.ts:21,71` defines `startEditing`, and nothing calls it
(`app/(mandor)/bkm/edit.tsx` + `useBkmPanenStore` show the intended pattern). There is no `checker/edit.tsx`
route — the stack registers only `index`, `add`, `[id]` (`app/(mandor)/checker/_layout.tsx`). `useUpdateBkmChecker`,
`useUpdateBkmCheckerDetail`, `useDeleteBkmChecker` and `useRejectBkmChecker` have **no call sites**. The detail
screen offers exactly one action: "Setujui Checker".

Impact: a mistyped plate or a wrong janjang count can only be corrected by creating a second document — which
then cannot be deleted either. Rejected or abandoned documents accumulate permanently. BKM Panen is strictly
better here (long-press delete of `DRAFT` with offline queueing, `BkmPanenList.tsx:88-115`).

Smallest fix: long-press delete on `CheckerCard` for `DRAFT`/`SUBMITTED`-by-owner, reusing the
`BkmPanenList` handler shape (including the offline `DELETE` queue branch, which `useSyncProcessor.ts:127-130`
already supports).

### CHK-06 — Two parallel SPB implementations; the shipped one is the weaker

`services/staging.service.ts` wraps `POST /staging/krani-timbang`, is exported from `services/index.ts:17`, and is
called by **no screen**. That endpoint performs signature verification, freshness, TPH-in-org, duplicate
prevention via `unique_transaction_id`, the `APPROVED` + never-weighed gate, and a discrepancy decision
(approve within tolerance, otherwise `REVISION_REQUESTED`) — `stagingController.ts:31-148`.

The shipped checker→krani path instead re-implements a weaker subset on-device (format + freshness) and posts to
`POST /kraniTimbang`, losing duplicate prevention, the status gate, and server-side discrepancy tolerance.

Impact: the SPB's entire purpose — preventing manual re-entry errors at the weighbridge — is only half realised,
and the strongest guard rail in the backend is dead code.

Smallest fix: have `scan.tsx` post the scanned payload to `/staging/krani-timbang` and route on the
`reconciled` / `discrepancy_pct` response, instead of redirecting to the manual form. Confirm intended ownership
first: if staging is reserved for a different client, delete `staging.service.ts` so the next reader is not misled.
This is also the only real remedy for CHK-03b.

### CHK-07 — Re-submitting after a partial failure creates a duplicate document

`useBkmChecker.ts:149-176` chains create-header → create-N-details → `PUT status=SUBMITTED` with no rollback and
no idempotency key. On a detail failure the header survives as `DRAFT`; `Step3.tsx:137-138` shows "Gagal
Menyimpan" and deliberately keeps the form state, so the user taps Submit again — creating a **second** header.
Combined with CHK-05 there is no way to remove either one.

The offline path is correct here: `addToQueue` stores the header and details as a single queue item that
`useSyncProcessor.ts:114-131` replays atomically.

Smallest fix: reuse the offline queue for the online path (queue, then drain immediately), or delete the header
in the `catch` before alerting.

### CHK-08 — The seeded approver is the document's own author, and the client ignores the permission flag

Correction to an earlier draft of this report: the endpoint **is** permission-gated —
`bkmCheckerRoute.ts` guards `POST /:id/approve` with `checkPermission("mod_bkm_checker", "approve")`. There is no
missing server-side permission check. The real findings are narrower and more interesting:

- The permission model has a dedicated `approve` action (`types/auth.ts:25`), and the seed grants it on
  `mod_bkm_checker` to **Mandor Panen** (`roleSeeder.ts:64`, bundle `createReadUpdateApprove`) while
  **Asisten Afdeling** gets `readOnly` (`:92`). So the cargo document is approved by the mandor who created it —
  separation of duties does not exist *by seed design*, not by accident. Administrator and Manajer Kebun hold
  `fullAccess` (`:49`, `:129`).
- The client never consults that flag: `[id].tsx:91` is `canApprove = data.status === 'SUBMITTED'`. A role whose
  bundle has `approve: false` (e.g. Krani Timbang, `:113`) still sees an enabled "Setujui Checker" button and gets
  a raw 403 from the server. `useAuthStore.ts:77-89` already exposes `hasPermission('mod_bkm_checker','approve')`
  for exactly this.
- The controller allows approval from any status other than `APPROVED`, including `DRAFT`
  (`bkmCheckerController.ts:581-584`); `DOCUMENT_TRANSITIONS.bkm_checker` deliberately has no
  `SUBMITTED → APPROVED` edge (`statusMachine.ts`), confirming approve is meant to be endpoint-only — but nothing
  stops a `DRAFT` document from being approved in one hop.

Impact: for the Asisten — the role that already approves BKM Panen (`mod_bkm_panen: createReadUpdateApprove`) and
is the natural reviewer of the sibling document — there is neither a Checker tab (`RoleTabs.tsx:37-41`) nor a
pending-checker widget (`TodaySummary.tsx:136` gates it to `(mandor)`, and `TodaySummary` returns `null` for
`(admin)`, `:32-41`). The reviewer has no path to the queue; the author approves their own work.

Smallest fix: see §10(b) — it is a seed change plus a client gate, not new infrastructure.

---

## 5. P3 findings

### CHK-09 — `CheckerCard` never received the accessibility work its sibling got

`PanenCard.tsx:27-33` carries `accessibilityRole`, a composed `accessibilityLabel`, a hint, and
`accessibilityActions` (`activate` / `longpress`); its header also got the overflow fix
(`flexWrap` + `flexShrink: 1, minWidth: 0`). `CheckerCard.tsx:24-28` and `:58-76` have none of it. The prior
UI/UX audit (this folder, 15 September) resolved this under "Document cards" for Panen only.

Impact: screen readers announce the whole card as one unlabeled button; a long block name pushes the status badge
out of alignment.

Smallest fix: copy the `PanenCard` touchable props and header styles onto `CheckerCard`.

### CHK-10 — Grading counters: undersized targets, unlabeled controls

`Step2.tsx:101-126`: the −/+ buttons are 36×36 with no `accessibilityRole`/`accessibilityLabel` (the glyphs "−"
and "+" are separate `Text` nodes, and the field name "Normal" is a sibling `Text`, not associated). The value
input (56×36) has no label. Edit/delete icons are 32×32 (`:396-403`). All are below the 44×44 guidance and are
invisible to TalkBack/VoiceOver as paired-with-a-field controls.

Impact: this is the highest-frequency interaction in the flow (6 counters × N trucks, tapped with gloves in
daylight). Mis-taps land silently in the count that becomes the SPB quantity.

Smallest fix: `accessibilityLabel={`${field.label}: ${value}`}` on the input, labels "Tambah/Kurangi
{field.label}" on the buttons, `hitSlop` instead of resizing.

### CHK-11 — A filtered list looks like a complete list

`index.tsx:21-30` reads a `status` route param (pushed by `TodaySummary.tsx:136-145`), but the header only prints
"N dokumen checker" (`:71-77`) — no active-filter chip, no reset — and the screen has no filter or search
affordance at all. BKM Panen has `FilterSortSheet`, sort, and an "Urut & Filter" button
(`BkmPanenList.tsx:118-203`).

Impact: after tapping the dashboard's pending card, a mandor sees a 2-item list and reasonably concludes their
documents are gone; the only way out is to leave the screen.

Smallest fix: render a removable chip ("Status: Submitted ✕") when the param is present. Reusing
`FilterSortSheet` is the same order of work and removes the sibling inconsistency.

### CHK-12 — Inline validation is available and unused

`FormField`, `FormSelect` and `FormDateField` all accept `error` and render an accessible alert row
(`FormField.tsx:53-62`). The checker form never passes it. Step 1 instead disables "Lanjutkan ke Truk & Grading"
(`Step1.tsx:68,121-126`) with no indication of which of blok/TPH/tanggal is missing; step 2 and step 3 raise
modal `Alert`s only after a submit attempt (`Step2.tsx:198-201`, `Step3.tsx:84-95`).

Impact: dead-button guessing on step 1; grading entry errors surface one screen later.

Smallest fix: pass `error` on step 1 for the three required fields after the first blocked tap.

### CHK-13 — The linked BKM Panen does not drive the header

`Step1.tsx:77-84` places the optional "BKM Panen" select **above** the required Blok/TPH/Tanggal fields, and
selecting a panen does not prefill blok/TPH — even though the linked panen carries the per-TPH janjang the mismatch
check later uses (`Step3.tsx:55-58,76-82`). An empty TPH picker after choosing a Blok is also silent: TPH options
are filtered client-side from a 200-row page (`Step1.tsx:59-61`).

Impact: two linked values entered independently, with the inconsistency revealed only on step 3.

Smallest fix: on panen select, derive `blok_id`/`tph_id` from the panen's detail for the chosen TPH; move the
panen select below the required block, or add a one-line hint on an empty TPH list.

### CHK-14 — RESTAN details can be silently dropped at approval

`bkmCheckerController.ts:600-608` creates restan records only when `existing.blok?.kelompok_lahan_id` is set. With
a block outside any kelompok, every `RESTAN` detail in the document is skipped without an error — the checker UI
says nothing about it either way.

Impact: the checker records "Restan" in good faith, the document shows as approved, and no restan inventory exists
to follow up. The loss surfaces only when someone later reconciles block-level restan totals.

Smallest fix: surface the outcome. Either reject at approve time with a clear message, or return the created restan
count so the approval confirmation can say "3 restan dicatat" / "restan tidak tercatat: blok tanpa kelompok".

### CHK-15 — Pickers truncate at 200 rows with no signal

`Step1.tsx:27-40` loads `blokApi`, `tphApi`, `lahanApi` with `limit: 200` and the panen list with `limit: 100`
(APPROVED only, newest first). Nothing says "showing 200 of N", and there is no pagination inside the sheet.
Also: the panen option label is `${blok} — ${tanggal}` with no TPH and no document short-id
(`Step1.tsx:63-66`), so two approved panen documents for the same block on the same date are indistinguishable.

Impact: on an estate with more than 200 blocks/TPH, options silently do not exist; an approved BKM Panen older
than the newest 100 cannot be linked.

Smallest fix: pass the selected blok's `lahan_id` to the TPH query (the endpoint already supports `filters`), and
query panen by the relevant date range instead of a fixed `limit: 100`.

### CHK-16 — Contrast failures on the SPB and approve surfaces

Measured against the actual tokens in `constants/Colors.ts`:

| Pair | Where | Ratio | AA (4.5:1) |
| --- | --- | --- | --- |
| `textMuted #999999` on white | `CheckerCard.meta` 13px (`CheckerCard.tsx:85`), SPB payload line 11px (`[id].tsx:323-328`) | 2.85:1 | fail |
| white on `success #4CAF50` | "Setujui Checker" 16px/600 (`[id].tsx:254-266`) | 2.78:1 | fail |
| white on `primary #6B7B3C` | form buttons, stepper buttons | 4.64:1 | pass (marginal) |
| `textSecondary #666666` on white | date line, row labels | 5.74:1 | pass |

The approve button is also a bare `TouchableOpacity` with no `accessibilityRole="button"` or label.

Smallest fix: darken the approve button (or use the primary token) and drop `textMuted` to `textSecondary` for
body copy.

---

## 6. P4 findings

- **CHK-17** — The SPB card labels the document's id prefix as a signature: `Signature: {data.id.slice(0, 8)}...`
  (`[id].tsx:121`). It is not the signature, and it is the only identifier on a document that has no SPB number.
- **CHK-18** — Raw enum values reach the UI: `Status: SUBMITTED` (`[id].tsx:158`) and `tipe_pengiriman`
  (`:167,190`) appear beside the localized badge ("Submitted"/"Approved", `DocStatusBadge.tsx:6-12`).
- **CHK-19** — Success feedback is asymmetric: offline submit alerts "Antrian Offline" (`Step3.tsx:132`), online
  submit navigates back silently (`Step3.tsx:134-136` + `add.tsx:19`). A queued document is also invisible in the
  list (no optimistic entry, no pending badge) — it surfaces only in Akun.
- **CHK-20** — Share is image-only. `expo-sharing` + `ViewShot` PNG (`[id].tsx:67-89`): no PDF, no copyable text
  fallback, and "Fitur berbagi tidak didukung di perangkat ini" is the terminal state.
- **CHK-21** — Step 3 shows component counts per detail but not each truck's `jumlah_janjang` (`Step3.tsx:187-202`)
  — the number that actually matters, already computed in the store (`useBkmCheckerStore.ts:55-61`).
- **CHK-22** — `Step3.tsx:41,71,181` falls back to `bjr = 15` when org config is missing and presents the result
  as "Estimasi Tonase". It does print "(15 kg/janjang)", but a missing config should read as an assumption.
- **CHK-23** — Admin parity gaps: the admin screens are the mandor screens verbatim, including the title
  "BKM Checker Baru" and the FAB; the admin dashboard has no pending-checker widget (§CHK-08); `TodaySummary.tsx:142`
  hardcodes `/(mandor)/checker` rather than using the `group` it already computed at `:131`.
- **CHK-24** — The dashboard's pending-checker count is derived from the first 100 rows (`TodaySummary.tsx:107-115`),
  so it can undercount on a busy day. There is no server-side count endpoint.

---

## 7. Verified working — do not regress

- Discard protection exists and is honest; the gap is only its scope (CHK-04).
- Offline submit queues the document **as one unit** and the SQLite write is awaited, so a failed enqueue keeps
  the form intact (`Step3.tsx:121-143`); `useSyncProcessor` replays header + details + submit for `bkm_checker`
  (`:114-131`).

> **Added 15 Sep (post-audit) — two corrections from the sync-pipeline audit**
> (`offline-sync-audit-2026-09-15.md`), which reviewed `useSyncProcessor` end to end:
>
> 1. "Replays **atomically**" overstates it. The replay is four sequential HTTP calls
>    (`useSyncProcessor.ts:115-123`), not a transaction: `POST /bkmChecker` → `POST /detail` ×N →
>    `PUT status=SUBMITTED`. If a later call fails the item stays queued and the next attempt re-runs the first
>    call, creating a **second document** — the same root cause as CHK-07, reached via the offline path rather
>    than the online one. CHK-07's "smallest fix" (reuse the queue for the online path) would therefore
>    *propagate* this defect rather than fix it; the real remedy needs an idempotency key server-side.
> 2. `processItem` has no `action === 'UPDATE'` branch for `bkm_checker`, and resolves successfully for any
>    module/action it does not recognise — the orchestrator then deletes the item (C3 there). Latent today
>    because no edit UI exists, but it must be fixed **before** building the edit screen that CHK-05 recommends.

- Duplicate-tap and double-submit guards: `savingRef` + `isSaving` + disabled controls (`Step3.tsx:33,74,121,219-227`).
- BKM Panen mismatch is computed with a named tolerance, shown before submit, and blocks the CTA
  (`Step3.tsx:20,67-70,168-184,223`).
- RESTAN treats truck/sopir/tujuan as optional while LANGSUNG/TITIP require them, validated in both step 2 and
  step 3 (`Step2.tsx:193-202`, `Step3.tsx:84-95`).
- `jumlah_janjang` is derived in the store, not typed by the user (`useBkmCheckerStore.ts:55-61`).
- Role-group integrity: `useModuleGroup` keeps shared screens inside the group that opened them, and the admin
  stack is guarded by `AdminModuleGuard` (`module="checker"`, permission `mod_bkm_checker`).
- Shared form primitives are already accessible (labels, error live regions, combobox roles, sheet dismissal):
  `FormField.tsx:41,53-62`, `FormSelect.tsx:153-167,226,274-281`, `FormDateField.tsx:120-139`.

---

## 8. Needs device verification

1. **Keyboard overlap.** `BKMCheckerForm.tsx:64-68` wraps step content in a `KeyboardAvoidingView` with
   `keyboardVerticalOffset={0}` while a ~100px `PageHeader` sits above it and a fixed footer below. On step 2 the
   grading inputs sit mid-card. Confirm the focused count is not hidden on a small Android screen, and with a
   large system font.
2. **Large text.** Fixed 36/44/48 heights (`Step2.tsx:450-474,504-514`, footer buttons) and the 56px counter input
   with `allowFontScaling` on by default. Confirm no clipping at 200% font scale.
3. **Grading entry speed.** Time a realistic 3-truck document with the +/− buttons versus the numeric inputs; the
   inputs ignore empty/partial values (`Step2.tsx:112-117`), so clearing a field visually snaps back to the old
   number. Decide whether a quick keypad-entry pattern is needed.
4. **SPB legibility.** Scan the shared PNG from a second phone at arm's length, and confirm the 180px QR plus the
   8-line summary still fits when `nomor_truk`/`nama_sopir` are long.
5. **TalkBack/VoiceOver pass** over list → step 2 counters → step 3 confirm checkbox (a bare `TouchableOpacity`
   with no checkbox role, `Step3.tsx:204-215`).

## 9. Suggested fix order

| Order | Item | Why first |
| --- | --- | --- |
| 1 | CHK-03 sign issue-time, not report date | One line; unblocks every SPB older than 48h. |
| 2 | CHK-02 gate the QR on APPROVED (and the krani lookup) | Restores the documented approval gate. |
| 3 | CHK-01 decide the SPB unit (per truck or per document) | The data-integrity decision everything else depends on. |
| 4 | CHK-04 per-step back | Blocks silent data loss on the most common correction path. |
| 5 | CHK-05 delete/reject for `DRAFT`/`SUBMITTED` | The recovery path that makes CHK-07 survivable. |
| 6 | CHK-07 idempotent submit | Reuse the offline queue; removes duplicate documents. |
| 7 | CHK-08 pick and enforce the approver role | Product decision, then a seed change + one client gate (§10b). |
| 8 | CHK-06 + CHK-03b route the scan through `/staging/krani-timbang` | Highest leverage, but only *after* the four CHK-01 consequences are fixed, and it needs ownership confirmation (§10c). |
| 9 | CHK-09…CHK-16 | Accessibility, contrast, filter visibility, validation, picker limits. |

Items 1–3 are small diffs with outsized effect and can ship together. Item 8 should not be attempted before
deciding whether staging is the intended contract, and cannot work for multi-truck documents until the dedup key,
the never-weighed gate and the discrepancy baseline are corrected.

## 10. Decisions and recommendations

### (a) SPB unit — decided: the document

Recorded in CHK-01, including the four backend assumptions that must move with it. Nothing further to decide here;
the presentation fix (list every truck on the SPB) is independent and can ship immediately.

### (b) Who approves — recommendation: Asisten Afdeling, mandor excluded

The permission model already answers this; the seed contradicts it. `approve` exists as a first-class action, and
the Asisten is the designated approver of the sibling document (`mod_bkm_panen: createReadUpdateApprove`,
`roleSeeder.ts:90`) but holds only `readOnly` on checker (`:92`), while the mandor holds
`createReadUpdateApprove` on the very document they author (`:64`). Approval is not a status label here: it gates
the SPB QR and auto-creates RESTAN inventory (`bkmCheckerController.ts:599-620`), i.e. it commits stock. That is
the textbook maker-checker case, and the Asisten is the role accountable for block-level production.

Recommended change, smallest useful form:

1. `roleSeeder.ts`: `mandor_panen_role.mod_bkm_checker` → `approve: false`; `asisten_role.mod_bkm_checker` →
   `createReadUpdateApprove`. Leave Administrator and Manajer Kebun at `fullAccess` as the override path.
2. Client: gate the button on `hasPermission('mod_bkm_checker', 'approve')` (`useAuthStore.ts:77-89`), not on
   status alone; add the Checker tab for Asisten (`RoleTabs.tsx:37-41`); render the pending-checker card for
   Asisten by dropping the `group === '(mandor)'` condition (`TodaySummary.tsx:136`) and fix the hardcoded
   `/(mandor)/checker` route at `:142`.
3. Controller: restrict approve to `SUBMITTED` so `DRAFT` cargo cannot be approved in one hop.
4. Migration: role permissions live in the database, so this needs a reseed/migration for existing orgs, not just
   a code change.

The one judgement call: on a site with no Asisten present, refusing mandor approval blocks dispatch entirely. If
that is a real operating case, add an org-config flag (the `useOrgConfig` pattern already exists) rather than
re-granting the mandor by default — and keep the endpoint's permission check as the single gate either way.

### (c) Is `/staging/krani-timbang` the intended contract — recommendation: yes, adopt it server-side

Evidence that it is the intended path, not a prototype: a dedicated worker and service with batched atomic claim,
retry accounting, `FAILED` marking and revision notifications (`reconciliationWorker.ts`,
`ReconciliationService.ts`), plus `dev:worker` as a first-class root script. More decisively, only staging can
express the flow the mobile app is built around: the krani may reach the mill gate before the mandor's offline
checker document has synced. `POST /kraniTimbang` cannot represent that — it answers
"Invalid source checker for this organization" (`kraniTimbangController.ts:59-64`) — whereas staging parks the scan
as a `PENDING` log and lets the worker reconcile it. And since the on-device HMAC check is not a security control
anyway (CHK-03b), moving verification to the server loses nothing and gains a real signature check, duplicate
protection and the tolerance decision.

Recommended change:

1. `scan.tsx` posts the scanned payload to `/staging/krani-timbang` and routes on the response: `201 reconciled`,
   `202` queued for reconciliation, `409` duplicate, `400/403` rejected with the server's message.
2. Keep `POST /kraniTimbang` — it is the legitimate path for a delivery with no SPB (`origin_source: MANUAL`).
   Only the SPB-driven usage moves.
3. Delete the local `verifyQrPayload`/`isQrFresh` gate from the scan screen once staging is the gate, or keep it
   purely as an instant-feedback pre-check; if kept, drop the client-side secret entirely.
4. Do the four CHK-01 consequences first — with the current dedup key, staging can weigh one truck per document
   and would reject the rest.

If instead staging turns out to belong to a different client, then `services/staging.service.ts` and
`types/staging.ts` should be deleted so the next reader is not misled, and the gaps in CHK-06 must be closed
inside `POST /kraniTimbang` instead (status gate, duplicate prevention, tolerance).

### (d) Let the server mint the SPB payload — recommended first change

`utils/qrHandler.ts` already exposes `QR_VERSION` and `generateSignature` but has no payload builder, and no SPB
endpoint exists. One small endpoint removes three findings at once:

```
GET /bkmChecker/:id/spb        (checkPermission('mod_bkm_checker', 'read'); requires status APPROVED)
  → { payload, issued_at, expires_at, trucks: [{ detail_id, nomor_truk, nama_sopir, tujuan_kirim, jumlah_janjang }] }
```

- **CHK-03** — the server chooses the issue timestamp, stable per issuance, so the payload no longer inherits the
  report date and the 48h window starts where it should.
- **CHK-03b** — `EXPO_PUBLIC_QR_SECRET_KEY` and the client-side `verifyQrPayload`/`isQrFresh` path are deleted
  outright; signing happens with the server key that already exists.
- **CHK-02 / CHK-06** — the endpoint can refuse to issue for a non-`APPROVED` document, making the approval gate
  structural rather than a client convention; re-issue becomes "call it again", which removes the "expired SPB is
  unfixable" dead end; and the same response can carry the truck list the SPB image needs (CHK-01 presentation).

The client then renders the returned string verbatim. Do **not** implement CHK-03 on the client alone — see the
note in that finding about the dedup key.

### Suggested PR sequence

| PR | Scope | Findings closed |
| --- | --- | --- |
| 1 | `GET /bkmChecker/:id/spb`; client renders it verbatim and deletes the client secret + local verify; QR gated on `APPROVED`; approve button gated on `hasPermission('mod_bkm_checker','approve')`; SPB lists all trucks; per-step back | CHK-03, CHK-03b, CHK-02, most of CHK-06, CHK-08 (client half), CHK-04, CHK-01 (presentation) |
| 2 | The four CHK-01 consequences **plus** `scan.tsx` → `/staging/krani-timbang` | CHK-01, CHK-06, 10(c) |
| 3 | Seed flip 10(b) + Asisten Checker tab and pending card; idempotent submit; delete/reject for `DRAFT` | CHK-08, CHK-07, CHK-05 |
| 4 | Accessibility, contrast, filter chip, inline validation, picker limits | CHK-09…CHK-16, CHK-17…CHK-24 |

PR 2 must stay one unit: the dedup key, the never-weighed gate and the discrepancy baseline are one assumption
stated three times, and adopting staging before fixing them means one truck weighed per document and the rest
rejected. Per-PR verification: `tsc --noEmit` plus `node --test scripts/check-audit.cjs
scripts/check-navigation.cjs` (the convention the 15 September audit established); the SPB scan walkthrough in §8
still needs a physical device.
