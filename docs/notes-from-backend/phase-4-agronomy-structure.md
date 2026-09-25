# Phase 4 frontend notes — structured agronomy and the work catalog

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the structured agronomy slice only. Field observations (pest, disease, census, rainfall), stock count, vehicle and fuel usage, and consumption metrics are later Phase 4 slices and are not covered here.

## Why this changed

A BKM Rawat could say who worked and what material left the store, but not how much ground was covered or how strong the mix was. "120 kg urea on block B01" is not reviewable without the treated area, the tree count, and the dose. Those facts are now first-class fields, so consumption per hectare and per tree becomes a query rather than a guess.

The work catalog also changed. It used to be one global list shared by every organization, with a mounted write API — meaning one tenant could rename or delete a work type that another tenant's records pointed at. Catalogs are now **shared for reading, owned for writing**.

## Contract shared by web and mobile

### New fields on a BKM Rawat detail

All optional and nullable. An existing labour-only entry stays valid, and nothing in the current form breaks by ignoring them.

| Field | Type | Meaning |
| --- | --- | --- |
| `luas_ha` | decimal, > 0 | Area actually treated, in hectares |
| `jumlah_pokok` | integer, > 0 | Trees actually treated |
| `metode` | string, ≤ 100 | How it was applied, for example `Tabur manual` or `Semprot knapsack` |
| `kondisi` | string, ≤ 255 | Field conditions at the time, for example `Cerah setelah hujan semalam` |

### New fields on each material usage inside a detail

| Field | Type | Meaning |
| --- | --- | --- |
| `dosis` | decimal, > 0 | Dose applied in this activity |
| `satuan_dosis` | string, ≤ 50 | Unit of that dose, for example `kg/pokok` or `ml/liter` |

`jumlah` is unchanged and remains the total quantity consumed — the number that moves stock on approval. `dosis` is documentary: it records the rate, not a second deduction. Do not compute one from the other on the client; a mandor rounds in the field and the two legitimately disagree.

### New fields on a material

| Field | Type | Meaning |
| --- | --- | --- |
| `bahan_aktif` | string, ≤ 255 | Active ingredient, for example `Glifosat 480 g/l` |
| `konsentrasi` | string, ≤ 100 | Concentration as printed on the label |

These live on the **product**, not on each application. Render them read-only inside the Rawat form from the material lookup; they are editable only on the material master screen.

Validation is applied only when a value is sent. A zero or negative `luas_ha`, `jumlah_pokok`, or `dosis` returns `400` from request validation.

### Work catalog scope

`GET /bkmRawat/lookups` and `GET /tipePekerjaan` now return the shared seeded catalog **plus** the signed-in organization's own entries. Another organization's entries are never returned and are rejected with `400 Invalid work type, category, or item` if an id is sent anyway.

`POST /tipePekerjaan` always creates an entry owned by the caller's organization. `PUT` and `DELETE` on a shared entry return:

```json
{ "error": "Shared work types cannot be changed by an organization" }
```

Treat `403` here as an expected state, not an error to retry: it means the row is part of the shared catalog.

Newly seeded shared activities cover the care work the roadmap requires and will appear in existing lookups without any client change: pest and disease (`Pengamatan Hama`, `Pengendalian Hama`, `Pengendalian Penyakit`), census (`Sensus Pokok`, `Pendataan Pokok Rusak`, `Penyulaman Pokok`), replanting (`Tanam Ulang`, `Rawat TBM`), infrastructure (`Rawat Jalan`, `Rawat Jembatan`, `Rawat Saluran Air`), and manual weeding (`Dongkel Anak Kayu`, `Sanitasi Pokok`).

## Web direction

1. **Rawat detail form.** Add an "Agronomi" group below the existing worker/result fields: treated area, tree count, method, conditions. Keep all four optional — the form must still submit with none of them filled, because a road-maintenance entry has no tree count.
2. **Material rows.** Add `dosis` and `satuan_dosis` beside the existing quantity input. Show `bahan_aktif` and `konsentrasi` as static helper text under the selected material so the supervisor can confirm the right product without leaving the form.
3. **Material master screen.** Add `bahan_aktif` and `konsentrasi` as editable fields.
4. **Work type admin.** Shared entries must render as read-only with the edit and delete actions disabled, and organization-owned entries as editable. Distinguish them by whether `org_id` is null in the response rather than by name.
5. **Detail and print views.** Show the new fields when present and omit the row when null; do not print `0` or `-` for an unrecorded area, because zero treated area means something different from unrecorded.

## Mobile direction

1. **Offline path is unchanged.** The new fields ride inside the existing `details[]` and `materials[]` payloads that the queue already sends, keyed by the same `client_request_id` and `client_detail_id`. No queue migration, no new mutation type.
2. **Local SQLite draft rows need the six new columns** (`luas_ha`, `jumlah_pokok`, `metode`, `kondisi`, `dosis`, `satuan_dosis`). A draft written by the previous app version has them absent; read them as null rather than defaulting to `0`.
3. **Master cache.** The cached `tipe_pekerjaan` list is now organization-scoped, so a cache filled under one signed-in user must not be served to another. The cache is already keyed by user and cleared on logout, which satisfies this — but do not relax that keying.
4. **Keyboard and units.** `luas_ha` and `dosis` are decimal; `jumlah_pokok` is an integer. Use the decimal keypad for the first two, and keep `satuan_dosis` a free short text rather than a fixed picker, because units differ per product.
5. **Do not require the new fields to submit.** Connectivity is the constraint in the field; an entry with labour only must still queue.

## What is deliberately not here

- **No per-activity required-field rules.** Nothing forces a dose on a spraying activity yet. Every new field is optional at every layer. If the pilot returns blank dosages at a rate that hurts the reports, the rule belongs on `item_pekerjaan` as a backend rule, applied identically by both clients — not as client-side validation that the other client will disagree with.
- **No new screens.** This slice extends forms that already exist.

## Backend evidence

- Migration `20260922200000_agronomy_structure_and_org_catalog`
- `src/utils/catalog.ts`, `src/schemas/bkmRawat.schema.ts`, `src/schemas/material.schema.ts`
- `src/controllers/bkmRawatController.ts`, `src/controllers/bkmRawatDetailController.ts`, `src/controllers/tipePekerjaanController.ts`, `src/controllers/materialController.ts`
- `tests/integration/agronomy.integration.test.ts` — 5 tests covering structured capture, atomic stock deduction on approval, rejection of another organization's work type, lookup scope, and the shared-entry write refusal
