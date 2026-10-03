# Phase 5 frontend notes — transport trip identity

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the vehicle/driver assignment and transport-trip slice. The audit trace report is the remaining Phase 5 item.

## Why this changed

The Phase 4 note ended with: "the weighing document still stores its own `nomor_kendaraan` text. Do not change those screens yet — see the Phase 5 note." This is that note. You can change them now.

Two gaps were open. First, nothing connected a document to the vehicle master — a truck reached a weighing only as typed text, so a plate typed three ways was three trucks and no report could group by vehicle. Second, and worse for the audit trail: one BKM Checker document could be loaded onto two trucks, while only one weighing is ever allowed to claim a Checker. The second truck's load had nowhere to be weighed.

## The model, in one line

**A transport trip is the Krani Timbang document.** One truck, one driver, one departure, one weighing. There is no `trip` table and no trip screen to build — the document you already have *is* the trip. It gained the references it was missing.

## Contract

### BKM Checker detail — which truck was loaded

`POST /bkmChecker/detail` and `PUT /bkmChecker/detail/:id` accept two new optional fields:

| Field | Notes |
| --- | --- |
| `kendaraan_id` | A `kendaraan` record. When set, the response's `nomor_truk` is the master's plate, not what was typed |
| `supir_id` | A `supir` record. When set, `nama_sopir` comes from the master |

Sending `null` clears the link and leaves the free text alone. Omitting the field changes nothing. `GET /bkmChecker/detail?bkm_checker_id=…` now includes the `kendaraan` and `supir` objects, so a list can show the plate without a second lookup.

**One document, one truck.** Adding a detail with a different `kendaraan_id` than a row already on that document returns:

```
409 This BKM Checker is already loaded onto BK 1 AA. Use one document per truck.
```

Re-pointing one row with `PUT` hits the same rule when a sibling row still holds the old truck. This is not a validation nuisance to work around — it is the model. **Two trucks means two Checker documents.** Make that obvious in the UI: once a document has a vehicle, show it in the header and offer "buat dokumen baru untuk truk lain" rather than letting the user fight the error row by row.

### Krani Timbang — the trip

`POST /kraniTimbang` and `PUT /kraniTimbang/:id` accept:

| Field | Notes |
| --- | --- |
| `kendaraan_id` | Vehicle master reference; snapshots into `nomor_kendaraan` |
| `supir_id` | Driver master reference; snapshots into `nama_supir` |
| `nomor_dokumen` | The operation's own trip number. Unique per organization, entered by the user, not generated |

`nomor_kendaraan` and `nama_supir` are now optional *in the payload*, but **one of each pair is required**: `kendaraan_id` or `nomor_kendaraan`, and `supir_id` or `nama_supir`. A request with neither fails validation on the id field.

`GET /kraniTimbang` and `GET /kraniTimbang/:id` include the `kendaraan` and `supir` objects.

**The vehicle may not contradict the load.** Submitting a trip whose `kendaraan_id` differs from the vehicle its source Checkers were loaded onto returns:

```
409 Source BKM Checker was loaded onto BK 1 AA. One trip carries one truck.
```

### Free text still works

A trip that names no `kendaraan_id` submits and approves exactly as before. Neither `409` can fire on a document that never referenced the master. This is deliberate: an operation that has not entered its fleet must still be able to weigh fruit, and auto-reconciliation approves staging trips with no vehicle link at all. Do not build the forms as if `kendaraan_id` were mandatory.

Reconciliation links a staging trip to a vehicle only when the scanned plate matches a registered plate exactly. Drivers are never matched by name.

### Errors worth handling distinctly

| Status | Meaning |
| --- | --- |
| `400 Invalid kendaraan_id for this organization` | The vehicle belongs to another tenant, or was deleted |
| `400 Invalid supir_id for this organization` | Same, for the driver |
| `400` on `kendaraan_id` from request validation | Neither `kendaraan_id` nor `nomor_kendaraan` was sent |
| `409 ... Use one document per truck` | Second vehicle on one Checker; start a new document |
| `409 ... One trip carries one truck` | The trip's vehicle disagrees with its source Checker |

## Web direction

1. **Vehicle and driver pickers replace the free-text inputs** on the weighing form and on the Checker loading rows — a combobox that searches the master list, with "ketik manual" as a visible fallback rather than the default.
2. **Show the truck in the Checker document header**, not only on each row. It is a property of the document now, even though it is stored per row.
3. **Handle the one-truck `409` as a flow, not an error toast.** Offer to open a new Checker document carrying over TPH, block, and date.
4. **`nomor_dokumen` is a plain text field** with a uniqueness error on save. No generator exists; if the operation wants an auto-number, that is a separate request.
5. **Group weighing reports by vehicle** once the pickers are in use — this is the first time that is possible.

## Mobile direction

1. **Cache vehicles and drivers** — already listed in the Phase 4 note as part of the master cache. The Checker and weighing forms now need them offline.
2. **Keep the free-text field reachable offline.** A truck registered on the web while the phone was offline will not be in the cache; typing the plate must still work, and reconciliation will link it later if it matches.
3. **Send `kendaraan_id` when the vehicle came from the cache**, and the plate text otherwise. Never send a locally invented id.
4. **The one-truck `409` is a queue conflict, not a retryable failure.** Do not retry it — surface it for the user to resolve, per the existing conflict handling.

## What is deliberately not here

- **No `transport_trip` table.** The Krani Timbang document already carries vehicle, driver, destination, date, gross/tare/net, its source Checkers, and its restans. A second table would shadow it one-to-one.
- **No generated trip number.** `nomor_dokumen` is typed in. A generator needs a per-tenant sequence and retry handling for a field nothing currently reads.
- **No mandatory fleet list.** See "Free text still works".
- **No multi-leg or route modelling.** A trip is one departure to one destination.
- **No backfill of historical free text beyond exact plate matches.** The migration links only unambiguous matches; everything else stays text.

## Backend evidence

- Migration `20260922240000_transport_trip_identity`
- `src/services/TransportService.ts`
- `src/controllers/bkmCheckerDetailController.ts`, `src/controllers/kraniTimbangController.ts`, `src/services/ReconciliationService.ts`
- `src/schemas/bkmChecker.schema.ts`, `src/schemas/kraniTimbang.schema.ts`
- `tests/integration/transportTrip.integration.test.ts` — 8 tests; `tests/reconciliationService.test.ts` — plate-match linking
