# Phase 7 frontend notes — production, yield, harvest interval, and bunch weight

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Second Phase 7 slice (7.2). `/laporan` is mounted with its first three endpoints. Grading, shrinkage, restan, productivity, material, approval, and exception reports follow in later slices.

## Why this changed

Managers answer "how much did we harvest, where, and how often" from a spreadsheet today. These three endpoints answer it from the approved BKM Panen and weighing documents, with the rules in [Operational report definitions](../operational-reports.md). The display rules in [phase-7-report-definitions](phase-7-report-definitions.md) apply to everything below. Read that note first if you haven't.

## Contract

All three are `GET`, need `mod_laporan` **read**, and share these query parameters:

| Parameter                        | Required | Notes                                                                                                                                       |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tanggal_dari`, `tanggal_sampai` | yes      | Plain `YYYY-MM-DD` local dates, both inclusive, at most 366 days apart. A timestamp, an impossible date, or a reversed range returns `400`. |
| `grain`                          | no       | `range` (default, one row per group), `day`, `week` (starting Monday), `month`. Rows then carry `periode`, the first day of the period.     |
| `kelompok_lahan_id`, `blok_id`   | no       | Must belong to the caller's organization, or `400`.                                                                                         |
| `page`, `limit`                  | no       | `limit` defaults to 100, maximum 500.                                                                                                       |
| `format`                         | no       | `csv` returns every row, ignoring paging, as a file download.                                                                               |

Errors: `400` for validation, as `{ error: [{ field, message }], request_id }`, or for a foreign filter ID, as `{ error: "Invalid blok_id for this organization" }`. `403` without the permission.

### `GET /laporan/produksi` — R01 production and yield

Extra parameters: `lahan_id`, `tph_id`, `pekerja_id`, and `group_by`, a comma list of `kelompok_lahan`, `blok`, `lahan`, `tph`, `pekerja` (default `blok`, no repeats).

```json
{
  "definition": { "id": "R01", "version": 2 },
  "filters": {
    "tanggal_dari": "2026-08-01",
    "tanggal_sampai": "2026-08-31",
    "grain": "range",
    "timezone": "Asia/Jakarta",
    "bjr_used": 20,
    "group_by": ["blok"],
    "yield_basis": "blok",
    "kelompok_lahan_id": null,
    "blok_id": null,
    "lahan_id": null,
    "tph_id": null,
    "pekerja_id": null,
    "inclusion": "approved and submitted are separate columns; …"
  },
  "totals": {
    "approved": {
      "janjang": 260,
      "brondol": 21,
      "brondol_tidak_dicatat": 1,
      "kg_estimasi": 5200,
      "kg_estimasi_total": 5221,
      "baris": 5
    },
    "submitted": {
      "janjang": 40,
      "brondol": 4,
      "brondol_tidak_dicatat": 0,
      "kg_estimasi": 800,
      "kg_estimasi_total": 804,
      "baris": 1
    }
  },
  "data": [
    {
      "blok_id": "…",
      "blok_nama": "B1",
      "luas_ha": 10,
      "jumlah_pokok": 1300,
      "approved": {
        "janjang": 180,
        "brondol": 13,
        "brondol_tidak_dicatat": 1,
        "kg_estimasi": 3600,
        "kg_estimasi_total": 3613,
        "baris": 3,
        "yield_kg_per_ha": 361.3,
        "janjang_per_pokok": 0.1385
      },
      "submitted": {
        "janjang": 40,
        "brondol": 4,
        "brondol_tidak_dicatat": 0,
        "kg_estimasi": 800,
        "kg_estimasi_total": 804,
        "baris": 1,
        "yield_kg_per_ha": 80.4,
        "janjang_per_pokok": 0.0308
      }
    }
  ],
  "meta": { "page": 1, "limit": 100, "total": 3, "pages": 1 }
}
```

Each row carries an `<dimension>_id` and `<dimension>_nama` pair for every dimension in `group_by`. `lahan_id: null` is the "no parcel" group: harvest filed without a parcel. Show it with that label; don't drop it.

**Rendering rules specific to R01:**

1. **Yield appears only when `filters.yield_basis` is not null.** It is null when you group by TPH or worker, or when a filter is narrower than the grouping, for example `group_by=kelompok_lahan&blok_id=…`. When it is null, hide the yield columns rather than showing a column of dashes.
2. **`brondol` is kilograms of loose fruit.** `kg_estimasi` is bunches × BJR only; `kg_estimasi_total` adds the recorded brondol. Since R01 v2, `yield_kg_per_ha` is `kg_estimasi_total` ÷ area, so it includes loose fruit. Where no row recorded brondol it falls back to bunches alone; `brondol_tidak_dicatat` shows when that happened. See [phase-7-brondol-kg](phase-7-brondol-kg.md).
3. **`brondol: null` means every row left loose fruit blank.** Show a dash, and if `brondol_tidak_dicatat` is above zero, show it as "n baris tanpa brondol".
4. **Label `kg_estimasi` as estimated** and show `bjr_used` near it, for example "kg (estimasi, BJR 20)".
5. `baris` is the number of detail rows behind the figure. It is useful as a tooltip when a number looks odd.

### `GET /laporan/rotasi` — R02 harvest interval

`grain` is ignored. The response has one row per **active block**, including blocks never harvested:

```json
{
  "definition": { "id": "R02", "version": 2, "section": "rotasi" },
  "data": [
    {
      "kelompok_lahan_id": "…",
      "kelompok_lahan_nama": "Kebun Satu",
      "blok_id": "…",
      "blok_nama": "B1",
      "hari_panen": 2,
      "rotasi_rata_hari": 6.5,
      "rotasi_maks_hari": 7,
      "panen_terakhir": "2026-08-10",
      "hari_sejak_panen": 21,
      "panen_submitted_terakhir": "2026-08-12"
    }
  ],
  "meta": { "…": "…" }
}
```

There is no `totals`. The interval is computed from **approved** harvests only, and the gap from the last harvest before the range counts. `panen_submitted_terakhir` is a newer harvest still awaiting approval. Show it beside the approved date, for example "menunggu: 12 Agu".

**Web:** this is the report a manager scans for overdue blocks. Sort by `hari_sejak_panen` descending on the client (it's one page of blocks), and highlight rows above the estate's target rotation. There is no target in the backend yet, so make it a screen setting that defaults to 10 days, not a hard-coded number. `panen_terakhir: null` means never harvested and should sort first.

### `GET /laporan/bjr-aktual` — R02 actual bunch weight

`blok_id` returns `400`, because a weighing records the farm, not the block.

```json
{
  "definition": { "id": "R02", "version": 2, "section": "bjr_aktual" },
  "filters": { "bjr_used": 20, "…": "…" },
  "totals": {
    "approved": {
      "trip": 3,
      "netto_kg": 4450,
      "brondol_kg": 90,
      "janjang_timbang": 215,
      "bjr_aktual": 20.2791
    },
    "submitted": {
      "trip": 1,
      "netto_kg": 600,
      "brondol_kg": 0,
      "janjang_timbang": 30,
      "bjr_aktual": 20
    },
    "trip_multi_kebun": { "approved": 1, "submitted": 0 },
    "trip_tanpa_netto": { "approved": 1, "submitted": 0 },
    "trip_tanpa_detail": { "approved": 0, "submitted": 0 }
  },
  "data": [
    {
      "kelompok_lahan_id": "…",
      "kelompok_lahan_nama": "Kebun Satu",
      "approved": {
        "trip": 2,
        "netto_kg": 2800,
        "brondol_kg": 90,
        "janjang_timbang": 140,
        "bjr_aktual": 19.3571
      },
      "submitted": {
        "trip": 0,
        "netto_kg": 0,
        "brondol_kg": 0,
        "janjang_timbang": 0,
        "bjr_aktual": null
      }
    }
  ]
}
```

**These are measured kilograms**, not the estimate, so label them "kg timbang". Since R02 v2, `bjr_aktual` is (`netto_kg` − `brondol_kg`) ÷ `janjang_timbang`, because the truck is weighed with its loose fruit aboard. A trip that carried fruit from two farms counts in `totals` but in no farm row, so **farm rows do not add up to the total**. Say so under the table, with the `trip_multi_kebun` count. Show `bjr_aktual` beside `bjr_used`. The gap between them is why a manager opens this screen, because it tells them whether the BJR in settings is still right.

## Web direction

1. **Build these three on the shared report shell** described in the definitions note: date range, farm and block filters, grain toggle, approved/submitted pair, definition footer, and a CSV button.
2. **Production view:** a group-by picker (Kebun, Blok, Lahan, TPH, Pemanen) that allows several choices. "Blok" is the default; "Pemanen + day" is the harvester-output view. Keep yield columns hidden unless `yield_basis` is set.
3. **CSV:** request the same URL with `&format=csv` and let the browser download it. The file starts with three lines naming the definition, the range and timezone, and the inclusion rule, then a header row with columns such as `approved_janjang`, `submitted_janjang`.
4. **Permission:** hide the Laporan menu without `mod_laporan` read, and handle `403` anyway.

## Mobile direction

**Nothing to build in this slice.** The mobile summary (R11) reuses these figures and comes with slice 7.3. The Mandor Panen role does not hold `mod_laporan`; an administrator must grant read before the summary can load on a mandor's handset.

## What is deliberately not here

- **No block-level weighed kilograms.** The weighbridge weighs a truck, so block and worker kilograms are estimates by product decision.
- **No historical BJR.** Changing the BJR setting restates earlier estimates, which is why `bjr_used` is echoed in every response.
- **No target rotation in the backend.** Nobody has specified one per block. Keep it a screen setting until an estate asks for it to be stored.
- **No caching.** Figures are computed per request. At twice pilot scale a full year answers in under a second.

## Backend evidence

- `src/routes/laporanRoute.ts`, `src/controllers/laporanController.ts`, `src/services/ReportService.ts`, `src/schemas/laporan.schema.ts`
- `tests/integration/laporan.integration.test.ts`: 21 tests with hand-worked figures, including three timezone day-boundary cases
- `tests/permissionMiddleware.test.ts`: no token, missing read, another module's read, allowed read
- [Operational report definitions](../operational-reports.md): R01, R02, and the recorded performance measurements
