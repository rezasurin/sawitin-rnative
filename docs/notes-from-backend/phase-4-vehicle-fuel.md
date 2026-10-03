# Phase 4 frontend notes — vehicles, equipment, and fuel

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the vehicle and fuel slice. Consumption metrics are the last Phase 4 slice. This slice also unblocks part of Phase 5 — see the note at the end.

## Why this changed

`kendaraan` and `supir` have existed as tables since the beginning with no API at all: a vehicle could only reach the system by appearing as free text on a weighing document. And nothing recorded that a tractor ran for six hours on 45 litres of diesel, so fuel left the store without a document and never appeared in any cost figure.

## Contract shared by web and mobile

### Vehicle and driver master data

`GET/POST /kendaraan`, `GET/PUT/DELETE /kendaraan/:id` and the same five for `/supir`. Both are ordinary tenant-scoped CRUD with a list contract:

- `kendaraan`: filter on `nomor_kendaraan`, `jenis_kendaraan`, `status`; sort by those or `created_at`.
- `supir`: filter on `nama`, `status`; sort by those or `created_at`.

**Equipment is not a separate thing.** A tractor, a sprayer unit, and a truck are all `kendaraan` rows distinguished by `jenis_kendaraan`. Do not build a second "Equipment" screen — build one screen and let `jenis_kendaraan` group it.

Permissions for both come from the **weighing module** (`mod_krani_timbang`), which already consumes vehicles. No new grant, no new row in the role editor.

### Usage records

`/pemakaianKendaraan` follows the familiar document shape — `DRAFT` → `SUBMITTED` → `APPROVED`, rejection to `REVISION_REQUESTED` — with `POST /:id/approve`, `POST /:id/reject`, `GET /:id/history`, and `client_request_id` replay support.

| Field | Required | Notes |
| --- | --- | --- |
| `kendaraan_id` | yes | Vehicle or equipment |
| `supir_id` | no | A registered driver |
| `pekerja_id` | no | An operator who is not a registered driver |
| `bkm_rawat_id` | no | The maintenance document this served |
| `tanggal` | yes | |
| `meter_awal`, `meter_akhir`, `satuan_meter` | no | See below |
| `material_id`, `jumlah_bbm` | no | See below |
| `keterangan` | no | |

Permissions come from the **BKM Rawat module** (`mod_bkm_rawat`), because a usage record links to maintenance work and moves stock the same way that document does.

### One meter pair, two kinds of meter

A truck counts kilometres, a tractor counts hours. There is one pair of readings plus `satuan_meter` (`km` or `jam`) rather than two pairs that could disagree. Default `satuan_meter` from `jenis_kendaraan` if you can, and let the user change it. `meter_akhir` below `meter_awal` is rejected with `400`.

### Fuel is all-or-nothing

`material_id` and `jumlah_bbm` must both be present or both absent — half a pair returns `400 Fuel needs both material_id and jumlah_bbm, or neither`. In the form, a fuel section that is either fully filled or left empty; do not let the user type a quantity before picking the product.

On approval the quantity is deducted from that material's stock, in the same transaction, as an `OUT` movement referencing this record. If stock is short, the **entire approval fails** and the record stays `SUBMITTED` — nothing partial is applied. Surface that as a retryable error, not as "approved with a warning".

Usage with no fuel at all is perfectly valid and moves no stock.

### Errors worth handling distinctly

| Status | Meaning |
| --- | --- |
| `400 Kendaraan not found` / `Supir not found` / `BKM Rawat not found` | The reference belongs to another organization |
| `400 Fuel needs both material_id and jumlah_bbm, or neither` | Half a fuel entry |
| `400 meter_akhir cannot be lower than meter_awal` | Meter runs backwards |
| `409 Only a draft vehicle usage record can be changed` | Editing after submission |
| `409 ... no longer submitted` | A concurrent approval won; refresh |
| `500` mentioning *Insufficient stock* | Fuel short; nothing was applied, the record is still `SUBMITTED` |

## Web direction

1. **Master data screens for vehicles and drivers** under the same area as other masters. One vehicle screen, grouped or filtered by `jenis_kendaraan` — not separate vehicle and equipment screens.
2. **Usage list and form** beside BKM Rawat. The form is short enough to be one page: vehicle, operator, date, meter pair, optional fuel block, optional link to a Rawat.
3. **Linking to a Rawat** should offer that day's maintenance documents for the same kebun rather than a raw id picker.
4. **Approval dialog names the fuel effect** — "45 liter Solar akan dikurangi dari stok" — since that is the part that is hard to undo.
5. **Replacing free-text vehicle entry on the weighing screens** is now possible but is *not* part of this slice; the weighing document still stores its own `nomor_kendaraan` text. Do not change those screens yet — see the Phase 5 note.

## Mobile direction

1. **Operator-facing, so it belongs on mobile** — unlike the stock count. A driver or mandor records the run at the end of it.
2. **Send `client_request_id`** on create, reuse it across retries, and treat `200` and `201` as the same success.
3. **Do not queue approvals.** Approval moves fuel and must run against live stock; queue the draft and its submission, leave approval to whoever holds the permission when they are online.
4. **Cache vehicles and drivers** alongside the existing Phase 2 master cache — same read-through pattern, same per-user keying, cleared on logout. They are small lists and the form is unusable without them.
5. **Meter readings are the error-prone field.** Prefill `meter_awal` with the last approved `meter_akhir` for that vehicle when you have it, and warn on an implausible jump rather than blocking.

## What is deliberately not here

- **No trip or route modelling.** A usage record says a vehicle ran; it does not model a journey with legs. Transport trips are Phase 5.
- **No separate equipment table.** `jenis_kendaraan` carries it.
- **No fuel ledger of its own.** Fuel is a material, its movements are `material_transaction` rows, and it appears in stock reports like anything else.
- **No maintenance or service schedule for vehicles.** Nobody asked.

## Note for Phase 5

Phase 5 needs "dedicated vehicle and driver management APIs/screens and complete trip assignment." This slice delivers the **APIs**; the screens and trip assignment remain. The weighing documents still carry `nomor_kendaraan` and `nama_supir` as free text, and pointing them at these records is a Phase 5 change with its own migration decision — do not change that contract from the client side.

## Backend evidence

- Migration `20260922230000_vehicle_usage`
- `src/schemas/kendaraan.schema.ts`, `src/schemas/supir.schema.ts`, `src/schemas/pemakaianKendaraan.schema.ts`
- `src/controllers/kendaraanController.ts`, `src/controllers/supirController.ts`, `src/controllers/pemakaianKendaraanController.ts`
- `src/routes/kendaraanRoute.ts`, `src/routes/supirRoute.ts`, `src/routes/pemakaianKendaraanRoute.ts`
- `tests/integration/vehicleUsage.integration.test.ts` — 6 tests covering tenant-scoped vehicle and driver CRUD, fuel deducted exactly once against a linked Rawat, usage with no fuel, half a fuel entry and a backwards meter refused, a foreign vehicle refused, and an insufficient-stock approval rolling back with the record left `SUBMITTED`
