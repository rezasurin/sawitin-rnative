# Phase 5 frontend notes — harvest trace and the PKS ticket

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Every Phase 5 implementation item is now complete; the phase gate awaits sign-off. This note covers the last slice.

## Why this changed

Two gaps closed together.

**Nothing recorded the mill's ticket.** The only factory-side figure was `penjualan.netto_pabrik`, on a sales document that requires `harga_tbs_id` — so a receipt could not be entered until someone had priced the load, and the ticket number, its timestamp, its photograph and the person who received the fruit had nowhere to live at all.

**Nothing could answer "where did this load come from".** The chain existed in the database — weighing to Checker to Panen to parcel — but reading it meant six queries and knowing which quantity means what. Now one call returns it.

## Tiket PKS

`GET/POST /tiketPks`, `GET/PUT/DELETE /tiketPks/:id`, `GET /tiketPks/:id/history`, plus `POST /tiketPks/list`.

| Field | Required | Notes |
| --- | --- | --- |
| `krani_timbang_id` | yes | The trip. **Not editable** — see below |
| `nomor_tiket` | yes | Unique within the organization |
| `tanggal_tiket` | yes | The mill's timestamp, not the estate's |
| `bruto_pabrik`, `tara_pabrik` | no | Not every mill prints them |
| `netto_pabrik` | yes | The one figure every ticket shows |
| `foto_url` | no | Photograph of the paper ticket |
| `diterima_oleh` | no | Who received the load |
| `keterangan` | no | |

**One ticket per trip.** A second returns `409 This weighing already has a PKS ticket`. A load weighed twice at the mill is a correction to the one ticket, not a second receipt.

**The trip is fixed.** `PUT` ignores `krani_timbang_id`. A ticket filed against the wrong trip is deleted and refiled, so the audit log shows both acts. Build the form that way — no "move to another trip" affordance.

**Weights must agree.** When gross and tare are both present they must equal the net within a kilogram of rounding, and that holds on partial updates too: changing only `netto_pabrik` on a ticket that already has gross and tare returns `400`. In the form, treat the three as one group.

**No status, no approval.** A ticket moves no stock and settles no money; the approval that matters is the weighing's. Do not build a submit/approve bar. Its history is `GET /tiketPks/:id/history` — `CREATE`, `REVISE`, `DELETE`.

Permissions come from the **weighing module** (`mod_krani_timbang`). No new grant, no new row in the role editor.

`penjualan` is unchanged and keeps its own `netto_pabrik`. The two can disagree; the trace flags it rather than picking a winner.

## Harvest trace

`GET /kraniTimbang/:id/trace`, weighing module `read` permission. `404` if the trip belongs to another organization.

Reachable from a PKS receipt too: both `tiket_pks` and `penjualan` carry `krani_timbang_id`, and the trip is what they both weigh.

```
trip         id, nomor_dokumen, tanggal, tujuan_kirim, status, origin_source,
             kendaraan, supir, approvals, detail_timbang
sources[]    bkm_checker (blok, lahan, tph, status, approvals, details)
             + bkm_panen (details attributed to this Checker's TPH)
workers[]    { id, nama } — deduplicated across Panen and Checker
evidence[]   { source, id, tph, foto_url, lat, lng } — field photos and the ticket photo
quantities   janjang / brondol / berat_kg / grading   (see below)
restan       left_at_source[] , carried_from_earlier[]
pks_ticket   the tiket_pks, or null
sale         the penjualan, or null
flags[]      { code, detail }
history[]    operational_audit_log rows for every document above, chronological
```

### The two ledgers

**Do not mix them in the UI either.** Bunches are counted in the field, kilograms are weighed on a bridge.

`quantities.janjang` — `panen`, `checker_total`, `checker_loaded`, `checker_restan`, `weighed`, `restan_left_at_source`, `restan_carried_from_earlier`.

`quantities.berat_kg` — `internal_bruto`/`internal_tara`/`internal_netto`, `pks_bruto`/`pks_tara`/`pks_netto`, `susut`, `sale_netto_pabrik`. All are **decimal strings or null**, not numbers. Render them as given; do not parse and reformat, and do not treat `null` as zero.

### Three counting rules the screen must not undo

1. **`restan_carried_from_earlier` is already inside `weighed`.** The krani weighed the whole truck. Show it as "of which, restan dari hari sebelumnya", never as a separate line added to a total.
2. **A Panen document shared by several Checkers is attributed per TPH.** `quantities.janjang.panen` is already correct — never sum `sources[].bkm_panen.details` yourself across sources.
3. **Grading is a breakdown, not a deduction.** `quantities.grading.checker` and `.panen` each carry the six grade counts, `jumlah_janjang` (authoritative), `breakdown_total`, and `reconciles`. Nothing in the backend relates the grade columns to `jumlah_janjang`, so do not compute "rejected = total − normal" in the client. Show both; when `reconciles` is false, show it as a warning.

### Flags

| Code | Meaning |
| --- | --- |
| `checker_grading_breakdown_mismatch` / `panen_grading_breakdown_mismatch` | Grade columns do not add up to the recorded janjang |
| `pks_netto_disagrees_with_sale` | Ticket and sale report different factory weights |
| `restan_exceeds_weighed` | More restan attributed than the trip weighed |
| `no_pks_ticket` | The load has not been reconciled against the mill yet |
| `vehicle_not_registered` | Trip is still on free text; it cannot be grouped by vehicle |

An empty `flags` array is the happy path and worth showing as such.

## Web direction

1. **A trace screen reached from the weighing detail, the sale, and the ticket.** One route, three entry points — all three know the `krani_timbang_id`.
2. **Lay it out as the physical chain**, top to bottom: TPH and workers → Checker grading → truck → estate weighbridge → mill ticket → sale. An auditor reads it in that order.
3. **Flags go at the top**, not buried at the bottom. They are the reason someone opened the screen.
4. **Ticket entry belongs next to the weighing**, not inside the sales form. A krani files tickets all afternoon without touching prices.
5. **Print or export the trace.** This is the artefact an auditor asks for; a PDF of this screen is the deliverable.

## Mobile direction

1. **Ticket entry is the mobile-worthy part** — a driver or krani photographs the paper at the gate. The trace itself is a desk activity; a read-only compact view is enough.
2. **Photograph first, fields second.** `foto_url` is the evidence; the typed numbers are a convenience.
3. **Do not queue the trace.** It is a read over live data and means nothing stale.
4. **Ticket creation may be queued**, but it has no `client_request_id` — the tenant-unique `nomor_tiket` and one-ticket-per-trip rule are the replay guards, so treat `409` as "already filed", not as a failure to retry.

## What is deliberately not here

- **No ticket approval workflow.** A ticket is a transcription; the weighing carries the approval.
- **No `penjualan` change.** It keeps its own `netto_pabrik`; the trace reports both and flags a disagreement.
- **No aggregate or cross-trip report.** This is one document's trace. Production, yield, shrinkage and restan-aging reports are Phase 7.
- **No derived reject figure.** See rule 3.
- **No `client_request_id` on tickets.** Nobody asked for offline ticket replay, and the unique constraints already prevent duplicates.

## Backend evidence

- Migration `20260922250000_pks_ticket`
- `src/services/HarvestTraceService.ts`, `src/controllers/tiketPksController.ts`, `src/schemas/tiketPks.schema.ts`, `src/routes/tiketPksRoute.ts`
- `getKraniTimbangTrace` in `src/controllers/kraniTimbangController.ts`, `src/routes/kraniTimbangRoute.ts`
- `tests/integration/phase5Gate.integration.test.ts` — 5 tests: every gate clause for one harvest, restan attributed without double counting, one Panen shared by two Checkers counted once, a ticket/sale disagreement flagged, and a duplicate ticket plus cross-tenant trace refused
